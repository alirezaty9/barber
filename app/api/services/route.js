import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { serviceSchema } from '@/lib/validation';
import { ok, guardAdmin, parseBody, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('services');

export async function GET() {
  try {
    const services = await prisma.service.findMany({ orderBy: { createdAt: 'asc' } });
    return ok(services);
  } catch (e) {
    log.error('GET services failed', e);
    return serverError();
  }
}

export async function POST(request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { data, response } = await parseBody(request, serviceSchema);
  if (response) return response;

  try {
    const service = await prisma.service.create({ data });
    revalidatePath('/'); // کش صفحه‌ی اصلی را تازه کن تا خدمت جدید فوری دیده شود
    return ok(service, { status: 201 });
  } catch (e) {
    // قبلاً این خطا بی‌صدا بلعیده می‌شد؛ حالا لاگ می‌شود تا علتِ واقعیِ «افزوده‌نشدن خدمت» دیده شود.
    log.error('POST service failed', e);
    return serverError();
  }
}
