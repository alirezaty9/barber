import { resolveAvailability } from '@/lib/availability-server';
import { ok, badRequest, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('availability');

// GET /api/bookings/availability?barberId=&date=
// عمومی — اسلات‌های آزاد یک آرایشگر در یک روز. موجودی مستقل از خدمات است:
// هر نوبت دقیقاً یک اسلات (۱ ساعت) می‌گیرد، پس تعداد/مدتِ خدمات در آن نقشی ندارد.
// (پارامترِ serviceId ممکن است هنوز از سمتِ کلاینت ارسال شود ولی نادیده گرفته می‌شود.)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barberId');
  const date = searchParams.get('date');

  if (!barberId || !date) return badRequest('barberId و date الزامی هستند.');

  try {
    const { error, dayOff, slots } = await resolveAvailability({ barberId, date });
    if (error) return badRequest(error);
    return ok({ dayOff, slots });
  } catch (e) {
    log.error('GET availability failed', e);
    return serverError();
  }
}
