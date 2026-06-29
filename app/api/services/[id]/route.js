import { prisma } from '@/lib/db';
import { serviceSchema } from '@/lib/validation';
import { ok, guardAdmin, parseBody, notFound, serverError } from '@/lib/api-helpers';

export async function PATCH(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, response } = await parseBody(request, serviceSchema.partial());
  if (response) return response;

  try {
    const service = await prisma.service.update({ where: { id }, data });
    return ok(service);
  } catch {
    return notFound('خدمت موردنظر یافت نشد.');
  }
}

export async function DELETE(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.service.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return notFound('خدمت موردنظر یافت نشد.');
  }
}
