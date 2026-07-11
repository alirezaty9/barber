import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { barberSchema } from '@/lib/validation';
import { serializeBarber, workDaysToCsv } from '@/lib/serializers';
import { ok, guardAdmin, parseBody, notFound, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('barbers:id');

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
  } catch (e) {
    if (e?.code === 'P2025') return notFound('آرایشگر موردنظر یافت نشد.');
    log.error('PATCH barber failed', e);
    return serverError();
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
  } catch (e) {
    if (e?.code === 'P2025') return notFound('آرایشگر موردنظر یافت نشد.');
    log.error('DELETE barber failed', e);
    return serverError();
  }
}
