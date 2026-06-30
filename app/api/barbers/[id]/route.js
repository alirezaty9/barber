import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { barberSchema } from '@/lib/validation';
import { serializeBarber, workDaysToCsv } from '@/lib/serializers';
import { ok, guardAdmin, parseBody, notFound } from '@/lib/api-helpers';

export async function PATCH(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, response } = await parseBody(request, barberSchema.partial());
  if (response) return response;

  // اگر workDays در بدنه آمده، آن را به CSV تبدیل کن؛ وگرنه دست نزن.
  const payload = { ...data };
  if (Array.isArray(data.workDays)) payload.workDays = workDaysToCsv(data.workDays);

  try {
    const barber = await prisma.barber.update({ where: { id }, data: payload });
    revalidatePath('/');
    return ok(serializeBarber(barber));
  } catch {
    return notFound('آرایشگر موردنظر یافت نشد.');
  }
}

export async function DELETE(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.barber.delete({ where: { id } });
    revalidatePath('/');
    return ok({ success: true });
  } catch {
    return notFound('آرایشگر موردنظر یافت نشد.');
  }
}
