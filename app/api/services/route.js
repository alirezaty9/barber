import { prisma } from '@/lib/db';
import { serviceSchema } from '@/lib/validation';
import { ok, guardAdmin, parseBody, serverError } from '@/lib/api-helpers';

export async function GET() {
  try {
    const services = await prisma.service.findMany({ orderBy: { createdAt: 'asc' } });
    return ok(services);
  } catch {
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
    return ok(service, { status: 201 });
  } catch {
    return serverError();
  }
}
