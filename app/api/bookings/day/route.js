import { prisma } from '@/lib/db';
import { resolveAvailability } from '@/lib/availability-server';
import { servicesLabelOf } from '@/lib/serializers';
import { guardAdmin, ok, badRequest, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('booking-day');

// GET /api/bookings/day?barberId=&date=
// فقط ادمین — «برنامه‌ی یک روز» را برمی‌گرداند: همان اسلات‌های موجودیِ صفحه‌ی رزروِ مشتری،
// ولی برای هر ساعتِ اشغال‌شده جزئیاتِ رزرو (نام/موبایل/خدمت/وضعیت) هم چسبانده می‌شود تا
// آرایشگر با کلیک روی هر ساعت بفهمد کدام مشتری آن نوبت را گرفته است.
// این جزئیات هرگز از روتِ عمومیِ availability بیرون نمی‌رود (جلوگیری از نشتِ PII).
export async function GET(request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  let barberId = searchParams.get('barberId');

  if (!date) return badRequest('date الزامی است.');

  try {
    // تک‌آرایشگری: اگر آرایشگر مشخص نشده بود، تنها آرایشگرِ سیستم را برمی‌داریم.
    if (!barberId || barberId === 'all') {
      barberId = (
        await prisma.barber.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } })
      )?.id;
    }
    if (!barberId) return badRequest('آرایشگری در سیستم ثبت نشده است.');

    // وضعیتِ هر اسلات (آزاد/رزرو/گذشته/بسته/تعطیل) دقیقاً با همان منطقِ صفحه‌ی مشتری.
    const { error, dayOff, slots } = await resolveAvailability({ barberId, date });
    if (error) return badRequest(error);

    // رزروهای فعالِ همان روز با جزئیات، برای چسباندن به اسلاتِ اشغال‌شده.
    const bookings = await prisma.booking.findMany({
      where: { barberId, date, status: { not: 'cancelled' } },
      include: { service: true, service2: true },
      orderBy: { timeSlot: 'asc' },
    });
    const byTime = new Map(bookings.map((b) => [b.timeSlot, b]));

    const enriched = slots.map((s) => {
      const b = byTime.get(s.time);
      if (!b) return s;
      return {
        ...s,
        booking: {
          id: b.id,
          code: b.code,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          servicesLabel: servicesLabelOf(b),
          status: b.status,
          paymentStatus: b.paymentStatus,
          amount: b.amount,
        },
      };
    });

    return ok({ dayOff, slots: enriched });
  } catch (e) {
    log.error('GET booking day failed', e);
    return serverError();
  }
}
