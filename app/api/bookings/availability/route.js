import { prisma } from '@/lib/db';
import { computeAvailability } from '@/lib/availability';
import { ok, badRequest, serverError } from '@/lib/api-helpers';

// GET /api/bookings/availability?barberId=&date=&serviceId=
// عمومی — اسلات‌های آزاد یک آرایشگر در یک روز، با لحاظ مدت‌زمان خدمت.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barberId');
  const date = searchParams.get('date');
  // serviceId می‌تواند چند شناسه‌ی جداشده با کاما باشد (تا دو خدمت).
  const serviceIds = (searchParams.get('serviceId') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!barberId || !date) return badRequest('barberId و date الزامی هستند.');

  try {
    const [barber, services, existing] = await Promise.all([
      prisma.barber.findUnique({ where: { id: barberId } }),
      serviceIds.length
        ? prisma.service.findMany({ where: { id: { in: serviceIds } } })
        : Promise.resolve([]),
      prisma.booking.findMany({
        where: { barberId, date, status: { not: 'cancelled' } },
        include: { service: true, service2: true },
      }),
    ]);

    if (!barber) return badRequest('آرایشگر یافت نشد.');

    // مدت‌زمان کل = مجموع مدت خدمت‌های انتخاب‌شده.
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0) || 60;

    const workDays = barber.workDays
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));

    const result = computeAvailability({
      serviceDuration: totalDuration,
      workDays,
      date,
      existing: existing.map((b) => ({
        timeSlot: b.timeSlot,
        duration: (b.service?.duration || 0) + (b.service2?.duration || 0) || 60,
      })),
    });

    return ok(result);
  } catch {
    return serverError();
  }
}
