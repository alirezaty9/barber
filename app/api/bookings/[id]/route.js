import { prisma } from '@/lib/db';
import { statusUpdateSchema } from '@/lib/validation';
import { refundPayment } from '@/lib/zarinpal';
import { ok, guardAdmin, parseBody, notFound, serverError, buildCancelPatch } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('bookings:id');

// PATCH — تغییر وضعیت نوبت (فقط ادمین).
// قاعده: لغو توسط ادمین/آرایشگر ⇒ ۱۰۰٪ مبلغِ پرداخت‌شده مسترد می‌شود.
export async function PATCH(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, response } = await parseBody(request, statusUpdateSchema);
  if (response) return response;

  try {
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return notFound('نوبت موردنظر یافت نشد.');

    // اگر ادمین نوبت را لغو می‌کند و قبلاً لغو نشده، استرداد کامل اعمال شود.
    let updateData;
    if (data.status === 'cancelled' && existing.status !== 'cancelled') {
      updateData = buildCancelPatch(existing, 'admin');
      if (updateData.refundAmount > 0) {
        const refund = await refundPayment({
          amount: updateData.refundAmount,
          authority: existing.paymentAuthority,
          description: `استرداد کامل لغو نوبت ${existing.code} توسط مدیریت`,
        });
        // استردادِ ناموفق → «در انتظار استرداد» تا وضعیت واقعی منعکس شود.
        if (!refund.ok) {
          log.warn(`admin refund failed for ${existing.code}: ${refund.error || 'unknown'}`);
          updateData.paymentStatus = 'refundPending';
        }
      }
    } else {
      updateData = { status: data.status };
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: { service: true, service2: true, barber: true },
    });
    return ok(booking);
  } catch (e) {
    if (e?.code === 'P2025') return notFound('نوبت موردنظر یافت نشد.');
    log.error('PATCH booking failed', e);
    return serverError();
  }
}

// DELETE — حذف دائمی نوبت (فقط ادمین).
export async function DELETE(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.booking.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    if (e?.code === 'P2025') return notFound('نوبت موردنظر یافت نشد.');
    log.error('DELETE booking failed', e);
    return serverError();
  }
}
