import { prisma } from '@/lib/db';
import { statusUpdateSchema } from '@/lib/validation';
import { refundPayment } from '@/lib/zarinpal';
import { ok, guardAdmin, parseBody, notFound, buildCancelPatch } from '@/lib/api-helpers';

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
        await refundPayment({
          amount: updateData.refundAmount,
          authority: existing.paymentAuthority,
          description: `استرداد کامل لغو نوبت ${existing.code} توسط مدیریت`,
        });
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
  } catch {
    return notFound('نوبت موردنظر یافت نشد.');
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
  } catch {
    return notFound('نوبت موردنظر یافت نشد.');
  }
}
