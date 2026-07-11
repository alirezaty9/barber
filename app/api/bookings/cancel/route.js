import { prisma } from '@/lib/db';
import { cancelSchema } from '@/lib/validation';
import { refundPayment } from '@/lib/zarinpal';
import { ok, parseBody, notFound, conflict, badRequest, serverError, buildCancelPatch } from '@/lib/api-helpers';
import { hashOtp, OTP_MAX_ATTEMPTS } from '@/lib/otp';
import { createLogger } from '@/lib/logger';

const log = createLogger('cancel');

// POST — لغو نوبت توسط مشتری با کدِ رهگیری + کدِ تأییدِ دومرحله‌ای (OTP).
// قاعده: لغو توسط مشتری ⇒ ۵۰٪ مبلغِ پرداخت‌شده مسترد می‌شود.
export async function POST(request) {
  const { data, response } = await parseBody(request, cancelSchema);
  if (response) return response;

  try {
    const booking = await prisma.booking.findUnique({ where: { code: data.code.trim() } });
    if (!booking) return notFound('نوبتی با این کد یافت نشد.');
    if (booking.status === 'cancelled') return conflict('این نوبت قبلاً لغو شده است.');

    // ── راستی‌آزماییِ کدِ تأییدِ دومرحله‌ای ──
    if (!booking.cancelOtpHash || !booking.cancelOtpExpiresAt) {
      return badRequest('ابتدا کد تأیید را درخواست کنید.');
    }
    if (booking.cancelOtpExpiresAt.getTime() < Date.now()) {
      return badRequest('کد تأیید منقضی شده است. دوباره درخواست کنید.');
    }
    if (booking.cancelOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return badRequest('تعداد تلاش‌های مجاز به پایان رسید. کد جدید بگیرید.');
    }
    if (hashOtp(data.otp) !== booking.cancelOtpHash) {
      // تلاشِ اشتباه → شمارنده را زیاد کن (تا پس از چند بار کد باطل شود).
      await prisma.booking.update({
        where: { id: booking.id },
        data: { cancelOtpAttempts: { increment: 1 } },
      });
      return badRequest('کد تأیید نادرست است.');
    }

    // ── محاسبه‌ی استرداد ──
    const patch = buildCancelPatch(booking, 'customer');
    if (patch.refundAmount > 0) {
      const refund = await refundPayment({
        amount: patch.refundAmount,
        authority: booking.paymentAuthority,
        description: `استرداد ۵۰٪ لغو نوبت ${booking.code}`,
      });
      // اگر استردادِ واقعی ناموفق بود، وضعیت را «در انتظار استرداد» بگذار نه «مسترد»،
      // تا سیستم دروغ نگوید پول برگشته.
      if (!refund.ok) {
        log.warn(`refund failed for ${booking.code}: ${refund.error || 'unknown'}`);
        patch.paymentStatus = 'refundPending';
      }
    }

    // اعمالِ لغو + پاک‌کردنِ OTPِ مصرف‌شده.
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { ...patch, cancelOtpHash: null, cancelOtpExpiresAt: null, cancelOtpAttempts: 0 },
      include: { service: true, service2: true, barber: true },
    });
    return ok(updated);
  } catch (e) {
    log.error('cancel failed', e);
    return serverError();
  }
}
