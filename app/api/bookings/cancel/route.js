import { prisma } from '@/lib/db';
import { cancelSchema } from '@/lib/validation';
import { refundPayment } from '@/lib/zarinpal';
import { ok, parseBody, notFound, conflict, serverError, buildCancelPatch } from '@/lib/api-helpers';

// POST — لغو نوبت توسط مشتری با کد رهگیریِ همان نوبت (عمومی).
// قاعده: لغو توسط مشتری ⇒ ۵۰٪ مبلغِ پرداخت‌شده مسترد می‌شود.
export async function POST(request) {
  const { data, response } = await parseBody(request, cancelSchema);
  if (response) return response;

  try {
    const booking = await prisma.booking.findUnique({ where: { code: data.code.trim() } });
    if (!booking) {
      return notFound('نوبتی با این کد یافت نشد.');
    }
    if (booking.status === 'cancelled') {
      return conflict('این نوبت قبلاً لغو شده است.');
    }

    const patch = buildCancelPatch(booking, 'customer');

    // استرداد واقعی (در صورت وجود توکن) — بدون توکن فقط حسابداری ثبت می‌شود.
    if (patch.refundAmount > 0) {
      await refundPayment({
        amount: patch.refundAmount,
        authority: booking.paymentAuthority,
        description: `استرداد ۵۰٪ لغو نوبت ${booking.code}`,
      });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: patch,
      include: { service: true, service2: true, barber: true },
    });
    return ok(updated);
  } catch {
    return serverError();
  }
}
