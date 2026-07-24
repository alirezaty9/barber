import { prisma } from '@/lib/db';
import { lookupSchema } from '@/lib/validation';
import { ok, parseBody, serverError, tooManyRequests } from '@/lib/api-helpers';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// POST — رهگیری نوبت توسط مشتری فقط با شماره موبایل (عمومی).
// چون یک شماره می‌تواند چند نوبت داشته باشد، فهرستی از نوبت‌ها برگردانده می‌شود.
export async function POST(request) {
  // ضدِ enumeration/harvestingِ PII: هم سقفِ IP و هم سقفِ per-phone تا کسی نتواند فضای
  // شماره‌ها را اسکن کند و برنامه‌ی حضورِ مشتری‌ها را برداشت کند.
  const ip = clientIp(request);
  if (!rateLimit({ key: `lookup-ip:${ip}`, limit: 10, windowMs: 60_000 }).ok) {
    return tooManyRequests('درخواست‌های زیاد. کمی بعد دوباره تلاش کنید.');
  }

  const { data, response } = await parseBody(request, lookupSchema);
  if (response) return response;

  if (!rateLimit({ key: `lookup-phone:${data.phone}`, limit: 5, windowMs: 60_000 }).ok) {
    return tooManyRequests('درخواست‌های زیاد برای این شماره. کمی بعد دوباره تلاش کنید.');
  }

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
