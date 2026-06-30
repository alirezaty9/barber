import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { barberSchema } from '@/lib/validation';
import { serializeBarber, serializeBarbers, workDaysToCsv } from '@/lib/serializers';
import { ok, guardAdmin, parseBody, serverError } from '@/lib/api-helpers';

export async function GET() {
  try {
    const barbers = await prisma.barber.findMany({ orderBy: { createdAt: 'asc' } });
    return ok(serializeBarbers(barbers));
  } catch {
    return serverError();
  }
}

export async function POST(request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { data, response } = await parseBody(request, barberSchema);
  if (response) return response;

  try {
    const barber = await prisma.barber.create({
      data: { ...data, workDays: workDaysToCsv(data.workDays) },
    });
    revalidatePath('/');
    return ok(serializeBarber(barber), { status: 201 });
  } catch {
    return serverError();
  }
}
