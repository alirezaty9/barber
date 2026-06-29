import { prisma } from '@/lib/db';
import { statusUpdateSchema } from '@/lib/validation';
import { ok, guardAdmin, parseBody, notFound } from '@/lib/api-helpers';

// PATCH — تغییر وضعیت نوبت (فقط ادمین).
export async function PATCH(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, response } = await parseBody(request, statusUpdateSchema);
  if (response) return response;

  try {
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: data.status },
      include: { service: true, barber: true },
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
