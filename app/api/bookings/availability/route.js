import { prisma } from '@/lib/db';
import { resolveAvailability } from '@/lib/availability-server';
import { ok, badRequest, serverError } from '@/lib/api-helpers';

// GET /api/bookings/availability?barberId=&date=&serviceId=
// عمومی — اسلات‌های آزاد یک آرایشگر در یک روز، با لحاظ مدت‌زمان خدمت و بستن‌های زمان.
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
    const services = serviceIds.length
      ? await prisma.service.findMany({ where: { id: { in: serviceIds } } })
      : [];
    // مدت‌زمان کل = مجموع مدت خدمت‌های انتخاب‌شده.
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0) || 60;

    const { error, dayOff, slots } = await resolveAvailability({ barberId, date, serviceDuration: totalDuration });
    if (error) return badRequest(error);

    return ok({ dayOff, slots });
  } catch {
    return serverError();
  }
}
