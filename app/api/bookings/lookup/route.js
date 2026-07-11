import { prisma } from '@/lib/db';
import { lookupSchema } from '@/lib/validation';
import { ok, parseBody, serverError } from '@/lib/api-helpers';

// POST — رهگیری نوبت توسط مشتری فقط با شماره موبایل (عمومی).
// چون یک شماره می‌تواند چند نوبت داشته باشد، فهرستی از نوبت‌ها برگردانده می‌شود.
export async function POST(request) {
  const { data, response } = await parseBody(request, lookupSchema);
  if (response) return response;

  try {
    // نتیجه‌ی جست‌وجو یک «فهرست» است؛ فهرستِ خالی یعنی «نوبتی نبود» — این خطا نیست.
    // پس همیشه 200 با آرایه (حتی خالی) برمی‌گردانیم و نمایشِ حالتِ خالی به UI سپرده می‌شود.
    const bookings = await prisma.booking.findMany({
      where: { customerPhone: data.phone },
      include: { service: true, service2: true, barber: true },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
    return ok(bookings);
  } catch {
    return serverError();
  }
}
