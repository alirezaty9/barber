import { prisma } from './db';
import { computeAvailability } from './availability';

// helper سروریِ مشترکِ محاسبه‌ی موجودی — از تکرارِ همان بلوک در سه روت جلوگیری می‌کند.
// آرایشگر، نوبت‌های فعال و بستن‌های زمانِ (blocks) همان روز را می‌خواند و اسلات‌ها را می‌سازد.
// @param {{barberId:string, date:string, serviceDuration:number}} p
// @returns {Promise<{error?:string, barber?:object, dayOff:boolean, slots:object[]}>}
export async function resolveAvailability({ barberId, date, serviceDuration }) {
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return { error: 'آرایشگر یافت نشد.', dayOff: true, slots: [] };

  const workDays = barber.workDays
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n));

  const [existing, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { barberId, date, status: { not: 'cancelled' } },
      include: { service: true, service2: true },
    }),
    prisma.barberBlock.findMany({ where: { barberId, date } }),
  ]);

  const { dayOff, slots } = computeAvailability({
    serviceDuration,
    workDays,
    date,
    existing: existing.map((b) => ({
      timeSlot: b.timeSlot,
      duration: (b.service?.duration || 0) + (b.service2?.duration || 0) || 60,
    })),
    blocks,
  });

  return { barber, dayOff, slots };
}
