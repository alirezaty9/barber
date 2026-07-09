import { prisma } from './db';
import { computeAvailability } from './availability';

// زمانِ فعلی به وقتِ ایران (مستقل از تایم‌زونِ سرور — روی Vercel سرور UTC است).
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

// helper سروریِ مشترکِ محاسبه‌ی موجودی — از تکرارِ همان بلوک در سه روت جلوگیری می‌کند.
// آرایشگر، نوبت‌های فعال و بستن‌های زمانِ (blocks) همان روز را می‌خواند و اسلات‌ها را می‌سازد.
// @param {{barberId:string, date:string, serviceDuration:number}} p
// @returns {Promise<{error?:string, barber?:object, dayOff:boolean, slots:object[]}>}
export async function resolveAvailability({ barberId, date, serviceDuration }) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return { error: 'آرایشگر یافت نشد.', dayOff: true, slots: [] };

  const [existing, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { barberId, date, status: { not: 'cancelled' } },
      include: { service: true, service2: true },
    }),
    prisma.barberBlock.findMany({ where: { barberId, date } }),
  ]);

  // اگر روزِ انتخابی «امروزِ ایران» است، ساعت‌های گذشته را غیرفعال کن.
  const now = tehranNow();
  const nowMinutes = date === now.iso ? now.minutes : -1;

  const { dayOff, slots } = computeAvailability({
    serviceDuration,
    existing: existing.map((b) => ({
      timeSlot: b.timeSlot,
      duration: (b.service?.duration || 0) + (b.service2?.duration || 0) || 60,
    })),
    blocks,
    nowMinutes,
  });

  return { barber, dayOff, slots };
}
