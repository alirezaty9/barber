import { resolveAvailability } from '@/lib/availability-server';
import { availabilityQuerySchema } from '@/lib/validation';
import { ok, badRequest, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('availability');

// GET /api/bookings/availability?barberId=&date=
// عمومی — اسلات‌های آزاد یک آرایشگر در یک روز. موجودی مستقل از خدمات است:
// هر نوبت دقیقاً یک اسلات (۷۵ دقیقه) می‌گیرد، پس تعداد/مدتِ خدمات در آن نقشی ندارد.
// (پارامترِ serviceId ممکن است هنوز از سمتِ کلاینت ارسال شود ولی نادیده گرفته می‌شود.)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    barberId: searchParams.get('barberId'),
    date: searchParams.get('date'),
  });
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message || 'پارامترهای درخواست نامعتبر است.');
  }
  const { barberId, date } = parsed.data;

  try {
    const { error, dayOff, slots } = await resolveAvailability({ barberId, date });
    if (error) return badRequest(error);
    return ok({ dayOff, slots });
  } catch (e) {
    log.error('GET availability failed', e);
    return serverError();
  }
}
