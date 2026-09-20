import { prisma } from '@/lib/db';
import { barberSchema } from '@/lib/validation';
import { serializeBarber, serializeBarbers, workDaysToCsv } from '@/lib/serializers';
import { ok, guardAdmin, parseBody, serverError } from '@/lib/api-helpers';

// GET — عمومی. فقط همان سه ستونی که واقعاً مصرف می‌شوند برمی‌گردد.
// (ستون‌های بی‌مصرفِ بازمانده از نسخه‌ی چندآرایشگره — تخصص، آواتار، عکس، امتیاز، بیوگرافی —
// هنوز در دیتابیس هستند ولی دیگر بیرون فرستاده نمی‌شوند.)
export async function GET() {
  try {
    const barbers = await prisma.barber.findMany({
      select: { id: true, name: true, workDays: true },
      orderBy: { createdAt: 'asc' },
    });
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
    return ok(serializeBarber(barber), { status: 201 });
  } catch {
    return serverError();
  }
}
