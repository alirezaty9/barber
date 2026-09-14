import { prisma } from './db';
import { computeAvailability } from './availability';
import { weekdayIndexSaturday } from './time';
import { workDaysToArray } from './serializers';

// مدتِ «نگه‌داشتنِ اسلات» برای رزروِ پرداخت‌نشده. رزروی که مشتری برای پرداخت ساخته ولی
// هنوز پرداخت نکرده، فقط تا این مدت اسلات را می‌گیرد؛ بعد از آن اسلات دوباره آزاد می‌شود
// (تا رزروهای رهاشده تقویم را برای همیشه قفل نکنند). جاروکشِ کرون (api/cron/expire-pending)
// این رکوردهای کهنه را در دیتابیس هم به cancelled تبدیل می‌کند.
export const PENDING_HOLD_MS = 15 * 60 * 1000; // ۱۵ دقیقه

// زمانِ فعلی به وقتِ ایران — صریحاً و مستقل از تایم‌زونِ سرور، هر چه که باشد.
// خروجی: { iso: 'YYYY-MM-DD', minutes: دقیقه‌ی گذشته از نیمه‌شب }
function tehranNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || '00';
  const hour = parseInt(get('hour'), 10) % 24;
  return {
    iso: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + parseInt(get('minute'), 10),
  };
}

// helper سروریِ مشترکِ محاسبه‌ی موجودی — از تکرارِ همان بلوک در چند روت جلوگیری می‌کند.
// آرایشگر، نوبت‌های فعال و بستن‌های زمانِ (blocks) همان روز را می‌خواند و اسلات‌ها را می‌سازد.
// موجودی مستقل از خدمات است: هر نوبت دقیقاً یک اسلات (۱ ساعت) می‌گیرد.
// قواعدِ تعطیلی: بستنِ کل‌روز، یا روزی که در workDaysِ آرایشگر نباشد.
// پارامترِ client اختیاری است: هنگامِ ساختِ رزرو، برای جلوگیری از race باید کلاینتِ تراکنش
// (tx) پاس داده شود تا این خواندن‌ها و INSERTِ بعدی در یک تراکنشِ Serializable باشند.
// @param {{barberId:string, date:string}} p
// @param {import('@prisma/client').PrismaClient} [client]
// @returns {Promise<{error?:string, barber?:object, dayOff:boolean, slots:object[]}>}
export async function resolveAvailability({ barberId, date }, client = prisma) {
  const [barber, bookings, blocks] = await Promise.all([
    client.barber.findUnique({ where: { id: barberId } }),
    client.booking.findMany({
      where: { barberId, date, status: { not: 'cancelled' } },
      select: { timeSlot: true, status: true, paymentStatus: true, createdAt: true },
    }),
    client.barberBlock.findMany({ where: { barberId, date } }),
  ]);
  if (!barber) return { error: 'آرایشگر یافت نشد.', dayOff: true, slots: [] };

  // رزروِ پرداخت‌نشده‌ی کهنه (قدیمی‌تر از PENDING_HOLD_MS) دیگر اسلات را اشغال نمی‌کند.
  const cutoff = Date.now() - PENDING_HOLD_MS;
  const existing = bookings.filter(
    (b) => !(b.paymentStatus === 'unpaid' && b.status === 'pending' && b.createdAt.getTime() < cutoff),
  );

  // روزِ کاری؟ اگر workDays خالی بود (پیکربندی‌نشده) همه‌ی روزها کاری فرض می‌شوند.
  const workDays = workDaysToArray(barber.workDays);
  const isWorkingDay = workDays.length === 0 || workDays.includes(weekdayIndexSaturday(date));

  // اگر روزِ انتخابی «امروزِ ایران» است، ساعت‌های گذشته را غیرفعال کن.
  const now = tehranNow();
  const nowMinutes = date === now.iso ? now.minutes : -1;

  const { dayOff, slots } = computeAvailability({ existing, blocks, nowMinutes, isWorkingDay });
  return { barber, dayOff, slots };
}

// آزادسازیِ رزروِ پرداخت‌نشده‌ی کهنه روی یک اسلاتِ مشخص، داخلِ همان تراکنشِ ساختِ رزرو.
//
// چرا لازم است؟ resolveAvailability رزروِ pending/unpaidِ قدیمی‌تر از PENDING_HOLD_MS را
// «آزاد» می‌بیند و اسلات را در دسترس نشان می‌دهد. ولی ایندکسِ یکتای دیتابیس (uniq_active_slot)
// آن رکورد را چون هنوز cancelled نشده «فعال» می‌شمارد؛ پس INSERTِ رزروِ جدید با P2002 شکست
// می‌خورد و پس از چند تلاش، مشتری خطای «این ساعت هم‌اکنون رزرو شد» می‌بیند — درحالی‌که UI اسلات
// را آزاد نشان داده بود. کرونِ expire-pending این‌ها را پاک می‌کند ولی روی پلنِ Hobby فقط روزی
// یک‌بار اجرا می‌شود، پس اسلات ممکن است تا یک روز قفل بماند. اینجا همان لحظه و اتمیک آزادش می‌کنیم.
export async function releaseStalePendingSlot(tx, { barberId, date, timeSlot }) {
  const cutoff = new Date(Date.now() - PENDING_HOLD_MS);
  await tx.booking.updateMany({
    where: {
      barberId,
      date,
      timeSlot,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: { lt: cutoff },
    },
    data: { status: 'cancelled', paymentStatus: 'failed' },
  });
}
