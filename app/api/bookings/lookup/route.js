import { prisma } from '@/lib/db';
import { lookupSchema } from '@/lib/validation';
import { ok, parseBody, notFound, serverError } from '@/lib/api-helpers';

// POST — رهگیری نوبت توسط مشتری فقط با شماره موبایل (عمومی).
// چون یک شماره می‌تواند چند نوبت داشته باشد، فهرستی از نوبت‌ها برگردانده می‌شود.
export async function POST(request) {
  const { data, response } = await parseBody(request, lookupSchema);
  if (response) return response;

  try {
    const bookings = await prisma.booking.findMany({
      where: { customerPhone: data.phone },
      include: { service: true, service2: true, barber: true },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
    if (bookings.length === 0) {
      return notFound('نوبتی با این شماره موبایل یافت نشد.');
    }
    return ok(bookings);
  } catch {
    return serverError();
  }
}
