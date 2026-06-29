import { prisma } from '@/lib/db';
import { computeAvailability } from '@/lib/availability';
import { ok, badRequest, serverError } from '@/lib/api-helpers';

// GET /api/bookings/availability?barberId=&date=&serviceId=
// عمومی — اسلات‌های آزاد یک آرایشگر در یک روز، با لحاظ مدت‌زمان خدمت.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barberId');
  const date = searchParams.get('date');
  const serviceId = searchParams.get('serviceId');

  if (!barberId || !date) return badRequest('barberId و date الزامی هستند.');

  try {
    const [barber, service, existing] = await Promise.all([
      prisma.barber.findUnique({ where: { id: barberId } }),
      serviceId ? prisma.service.findUnique({ where: { id: serviceId } }) : Promise.resolve(null),
      prisma.booking.findMany({
        where: { barberId, date, status: { not: 'cancelled' } },
        include: { service: true },
      }),
    ]);

    if (!barber) return badRequest('آرایشگر یافت نشد.');

    const workDays = barber.workDays
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));

    const result = computeAvailability({
      serviceDuration: service?.duration || 60,
      workDays,
      date,
      existing: existing.map((b) => ({ timeSlot: b.timeSlot, duration: b.service?.duration || 60 })),
    });

    return ok(result);
  } catch {
    return serverError();
  }
}
