import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { serviceSchema } from '@/lib/validation';
import { ok, guardAdmin, parseBody, notFound, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('services:id');

export async function PATCH(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, response } = await parseBody(request, serviceSchema.partial());
  if (response) return response;

  try {
    const service = await prisma.service.update({ where: { id }, data });
    revalidatePath('/');
    return ok(service);
  } catch (e) {
    if (e?.code === 'P2025') return notFound('خدمت موردنظر یافت نشد.');
    log.error('PATCH service failed', e);
    return serverError();
  }
}

export async function DELETE(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.service.delete({ where: { id } });
    revalidatePath('/');
    return ok({ success: true });
  } catch (e) {
    if (e?.code === 'P2025') return notFound('خدمت موردنظر یافت نشد.');
    log.error('DELETE service failed', e);
    return serverError();
  }
}
