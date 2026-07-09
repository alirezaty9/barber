import { prisma } from '@/lib/db';
import { ok, guardAdmin, notFound } from '@/lib/api-helpers';

// DELETE /api/blocks/:id — بازکردنِ یک بستنِ زمان (فقط ادمین).
export async function DELETE(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.barberBlock.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return notFound('موردی برای حذف یافت نشد.');
  }
}
