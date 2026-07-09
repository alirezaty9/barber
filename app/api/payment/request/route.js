import { prisma } from '@/lib/db';
import { bookingSchema } from '@/lib/validation';
import { computeAvailability } from '@/lib/availability';
import { requestPayment } from '@/lib/zarinpal';
import { ok, parseBody, conflict, badRequest, serverError, generateBookingCode } from '@/lib/api-helpers';

// آدرس پایه برای ساخت callback مطلق: ابتدا از env، سپس از هدرهای درخواست.
function resolveBaseUrl(request) {
  const env = process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

// POST — مسیر عمومیِ رزرو با پرداخت آنلاین:
// ۱) اعتبارسنجی و بررسی تداخل، ۲) ساخت رزرو pending/unpaid، ۳) شروع پرداخت زرین‌پال.
export async function POST(request) {
  const { data, response } = await parseBody(request, bookingSchema);
  if (response) return response;

  try {
    const serviceId2 = data.serviceId2 || null;

    // پروژه تک‌آرایشگره است: اگر barberId ارسال نشد، تنها آرایشگر انتخاب می‌شود.
    let barber = data.barberId
      ? await prisma.barber.findUnique({ where: { id: data.barberId } })
      : await prisma.barber.findFirst({ orderBy: { createdAt: 'asc' } });

    const [service, service2] = await Promise.all([
      prisma.service.findUnique({ where: { id: data.serviceId } }),
      serviceId2 ? prisma.service.findUnique({ where: { id: serviceId2 } }) : Promise.resolve(null),
    ]);
    if (!service) return badRequest('خدمت انتخابی معتبر نیست.');
    if (serviceId2 && !service2) return badRequest('خدمت دوم انتخابی معتبر نیست.');
    if (!barber) return badRequest('آرایشگر معتبری در سیستم ثبت نشده است.');

    const totalDuration = service.duration + (service2?.duration || 0);
    const totalPrice = service.price + (service2?.price || 0);

    // بررسی تداخل با نوبت‌های فعال همان روز.
    const existing = await prisma.booking.findMany({
      where: { barberId: barber.id, date: data.date, status: { not: 'cancelled' } },
      include: { service: true, service2: true },
    });

    const workDays = barber.workDays
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));

    const { dayOff, slots } = computeAvailability({
      serviceDuration: totalDuration,
      workDays,
      date: data.date,
      existing: existing.map((b) => ({
        timeSlot: b.timeSlot,
        duration: (b.service?.duration || 0) + (b.service2?.duration || 0) || 60,
      })),
    });

    if (dayOff) return conflict('آرایشگر در روز انتخاب‌شده مرخصی است.');
    const slot = slots.find((s) => s.time === data.timeSlot);
    if (!slot || !slot.available) {
      return conflict('این ساعت در دسترس نیست. لطفاً زمان دیگری انتخاب کنید.');
    }

    // ساخت رزرو موقتِ پرداخت‌نشده (کد یکتا با چند تلاش در صورت برخورد).
    let booking = null;
    for (let attempt = 0; attempt < 5 && !booking; attempt++) {
      try {
        booking = await prisma.booking.create({
          data: {
            code: generateBookingCode(),
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            serviceId: data.serviceId,
            serviceId2,
            barberId: barber.id,
            date: data.date,
            timeSlot: data.timeSlot,
            status: 'pending',
            amount: totalPrice,
            paymentStatus: 'unpaid',
          },
        });
      } catch (e) {
        if (e?.code !== 'P2002') throw e;
      }
    }
    if (!booking) return serverError('ثبت نوبت ناموفق بود. دوباره تلاش کنید.');

    // شروع پرداخت زرین‌پال.
    const base = resolveBaseUrl(request);
    const serviceNames = [service.name, service2?.name].filter(Boolean).join(' + ');
    const payment = await requestPayment({
      amount: totalPrice,
      description: `رزرو نوبت ${serviceNames} — کد ${booking.code}`,
      callbackUrl: `${base}/api/payment/verify`,
      mobile: data.customerPhone,
    });

    if (!payment.ok) {
      // اتصال به درگاه ناموفق → رزرو موقت لغو شود تا اسلات آزاد بماند.
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled', paymentStatus: 'failed' },
      });
      return serverError(payment.error || 'اتصال به درگاه پرداخت ناموفق بود.');
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentAuthority: payment.authority },
    });

    return ok({ paymentUrl: payment.url, code: booking.code }, { status: 201 });
  } catch {
    return serverError();
  }
}
