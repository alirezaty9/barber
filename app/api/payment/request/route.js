import { prisma } from '@/lib/db';
import { bookingSchema } from '@/lib/validation';
import { resolveAvailability } from '@/lib/availability-server';
import { resolveServices } from '@/lib/services-server';
import { requestPayment } from '@/lib/zarinpal';
import { createLogger } from '@/lib/logger';
import { ok, parseBody, badRequest, serverError, generateBookingCode, ApiError } from '@/lib/api-helpers';

const log = createLogger('payment:request');

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
    // یک یا چند خدمت → مجموع قیمت/مدت و برچسبِ نمایش.
    const svc = await resolveServices(data.serviceIds);
    if (svc.error) return badRequest(svc.error);

    // پروژه تک‌آرایشگره است: اگر barberId ارسال نشد، تنها آرایشگر انتخاب می‌شود.
    const barberId = data.barberId
      || (await prisma.barber.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id;
    if (!barberId) return badRequest('آرایشگر معتبری در سیستم ثبت نشده است.');

    const totalPrice = svc.totalPrice;

    // ساختِ رزروِ موقتِ pending/unpaid با حفاظت در برابرِ رزروِ همزمان (تراکنشِ Serializable).
    const booking = await createPendingBookingSafely({ data, svc, barberId, totalPrice });

    // شروع پرداخت زرین‌پال.
    const base = resolveBaseUrl(request);
    const payment = await requestPayment({
      amount: totalPrice,
      description: `رزرو نوبت ${svc.label} — کد ${booking.code}`,
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
  } catch (e) {
    if (e instanceof ApiError) return e.toResponse();
    log.error('payment request failed', e);
    return serverError();
  }
}

// چکِ موجودی و ساختِ رزروِ pending داخلِ یک تراکنشِ Serializable (ضدِ race)؛
// در برخوردِ همزمان (P2034/P2002) دوباره تلاش می‌کنیم.
async function createPendingBookingSafely({ data, svc, barberId, totalPrice }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const { error, dayOff, slots } = await resolveAvailability(
          { barberId, date: data.date },
          tx,
        );
        if (error) throw new ApiError(400, 'آرایشگر معتبری در سیستم ثبت نشده است.');
        if (dayOff) throw new ApiError(409, 'آرایشگر در روز انتخاب‌شده مرخصی است.');
        const slot = slots.find((s) => s.time === data.timeSlot);
        if (!slot || !slot.available) {
          throw new ApiError(409, 'این ساعت در دسترس نیست. لطفاً زمان دیگری انتخاب کنید.');
        }
        return tx.booking.create({
          data: {
            code: generateBookingCode(),
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            serviceId: svc.primaryId,
            serviceId2: svc.secondId,
            servicesLabel: svc.label,
            barberId,
            date: data.date,
            timeSlot: data.timeSlot,
            status: 'pending',
            amount: totalPrice,
            paymentStatus: 'unpaid',
          },
        });
      }, { isolationLevel: 'Serializable' });
    } catch (e) {
      if (e?.code === 'P2002' || e?.code === 'P2034') continue;
      throw e;
    }
  }
  throw new ApiError(409, 'این ساعت هم‌اکنون رزرو شد. لطفاً زمان دیگری انتخاب کنید.');
}
