import { prisma } from '@/lib/db';
import { bookingSchema } from '@/lib/validation';
import { resolveAvailability, releaseStalePendingSlot } from '@/lib/availability-server';
import { resolveServices } from '@/lib/services-server';
import { requestPayment } from '@/lib/zarinpal';
import { resolveRequestBaseUrl } from '@/lib/site';
import { createLogger } from '@/lib/logger';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { ok, parseBody, badRequest, serverError, tooManyRequests, generateBookingCode, ApiError } from '@/lib/api-helpers';

const log = createLogger('payment:request');

// POST — مسیر عمومیِ رزرو با پرداخت آنلاین:
// ۱) اعتبارسنجی و بررسی تداخل، ۲) ساخت رزرو pending/unpaid، ۳) شروع پرداخت زرین‌پال.
export async function POST(request) {
  // ── سقفِ نرخ (ضدِ پرکردنِ تقویم و ضدِ آلوده‌کردنِ آمارِ درگاه) ──
  // این گران‌ترین مسیرِ عمومیِ اپ است: هر فراخوانی هم یک رکورد در دیتابیس می‌سازد و هم یک
  // تراکنشِ واقعی در زرین‌پال. بی‌سقف، یک اسکریپتِ ساده می‌توانست همه‌ی ساعت‌های ۸ روزِ آینده
  // را با رزروِ پرداخت‌نشده بگیرد و مشتریِ واقعی هیچ‌وقت ساعتِ آزاد نبیند.
  const ipLimit = rateLimit({ key: `pay:${clientIp(request)}`, limit: 5, windowMs: 10 * 60_000 });
  if (!ipLimit.ok) return tooManyRequests('درخواست‌های زیاد. چند دقیقه بعد دوباره تلاش کنید.');

  const { data, response } = await parseBody(request, bookingSchema);
  if (response) return response;

  // سقفِ دوم روی شماره‌ی موبایل: جلوی کسی را می‌گیرد که با تغییرِ IP سقفِ بالا را دور بزند،
  // و هم‌زمان مانعِ ساختنِ چند رزروِ نیمه‌تمام با یک شماره می‌شود.
  const phoneLimit = rateLimit({ key: `pay-phone:${data.customerPhone}`, limit: 3, windowMs: 10 * 60_000 });
  if (!phoneLimit.ok) {
    return tooManyRequests('برای این شماره به‌تازگی چند رزرو ثبت شده. کمی بعد تلاش کنید.');
  }

  try {
    // یک یا چند خدمت (تا سقفِ اسکیما، بی‌تکرار) → مجموع قیمت و برچسبِ نمایش.
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
    const base = resolveRequestBaseUrl(request);
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
      // پیامِ خامِ درگاه فقط در لاگِ سرور می‌ماند؛ به مشتری یک پیامِ فارسیِ ثابت داده می‌شود
      // (پیامِ خامِ طرفِ سوم نه برای مشتری معنا دارد و نه باید بیرون برود).
      log.error(`gateway request failed: ${payment.error || 'unknown'}`);
      return serverError('اتصال به درگاه پرداخت ناموفق بود. کمی بعد دوباره تلاش کنید.');
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
        // رزروِ pending/unpaidِ کهنه‌ی همین اسلات را اتمیک آزاد کن تا با ایندکسِ یکتا برخورد نشود.
        await releaseStalePendingSlot(tx, { barberId, date: data.date, timeSlot: data.timeSlot });
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
