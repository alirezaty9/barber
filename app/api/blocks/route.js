import { prisma } from '@/lib/db';
import { blockSchema } from '@/lib/validation';
import { rangeISO, tehranTodayISO } from '@/lib/time';
import { ok, guardAdmin, parseBody, badRequest, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('blocks');

// GET /api/blocks?barberId=  — فهرست بستن‌های زمانِ یک آرایشگر (فقط ادمین).
export async function GET(request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barberId');
  const where = {};
  if (barberId && barberId !== 'all') where.barberId = barberId;
  // پیش‌فرض فقط زمان‌های «امروز به بعد». بدونِ این فیلتر، فهرستِ مرخصی‌ها انباشته می‌شد و
  // بعد از چند ماه پیداکردنِ مرخصیِ هفته‌ی آینده بینِ ده‌ها موردِ گذشته سخت می‌شد.
  if (searchParams.get('includePast') !== '1') where.date = { gte: tehranTodayISO() };

  try {
    const blocks = await prisma.barberBlock.findMany({
      where,
      include: { barber: { select: { name: true } } },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
    return ok(blocks);
  } catch (e) {
    log.error('GET blocks failed', e);
    return serverError();
  }
}

// POST /api/blocks — بستنِ کل روز(ها) یا ساعت‌های مشخص (فقط ادمین).
export async function POST(request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { data, response } = await parseBody(request, blockSchema);
  if (response) return response;

  try {
    const barber = await prisma.barber.findUnique({ where: { id: data.barberId } });
    if (!barber) return badRequest('آرایشگر انتخابی معتبر نیست.');

    // رکوردهای موردنظر را بساز: کل روز → یک رکورد بدون ساعت برای هر روزِ بازه؛
    // ساعت‌های مشخص → یک رکورد برای هر ساعت (فقط روی روزِ شروع).
    const rows = [];
    if (data.fullDay) {
      for (const date of rangeISO(data.date, data.dateTo)) {
        rows.push({ barberId: data.barberId, date, timeSlot: null, reason: data.reason });
      }
    } else {
      for (const slot of data.slots) {
        rows.push({ barberId: data.barberId, date: data.date, timeSlot: slot, reason: data.reason });
      }
    }

    // skipDuplicates نیاز به unique constraint دارد که اینجا نداریم؛ پس تکراری‌ها را
    // خودمان کنار می‌گذاریم تا رکورد دوتایی ساخته نشود.
    const existing = await prisma.barberBlock.findMany({
      where: { barberId: data.barberId, date: { in: rows.map((r) => r.date) } },
      select: { date: true, timeSlot: true },
    });
    const seen = new Set(existing.map((e) => `${e.date}|${e.timeSlot ?? ''}`));
    const fresh = rows.filter((r) => !seen.has(`${r.date}|${r.timeSlot ?? ''}`));

    // 🔴 نوبت‌های فعالی که در این بازه گرفتارند را بشمار و برگردان.
    //
    // بستنِ زمان، رزروهای موجود را لغو نمی‌کند — و نباید هم بکند (تصمیمِ آن با آرایشگر است،
    // چون شاملِ پولِ پرداخت‌شده و تماس با مشتری می‌شود). ولی قبلاً هیچ‌کس خبردار نمی‌شد:
    // پیامِ سبزِ «زمان موردنظر بسته شد» می‌آمد، آن ساعت‌ها از دیدِ آرایشگر محو می‌شدند و
    // مشتری سرِ ساعت می‌آمد. حالا رابطِ کاربری می‌تواند هشدار بدهد.
    const dates = [...new Set(rows.map((r) => r.date))];
    const hourly = rows.filter((r) => r.timeSlot).map((r) => r.timeSlot);
    const conflicts = await prisma.booking.findMany({
      where: {
        barberId: data.barberId,
        date: { in: dates },
        status: { not: 'cancelled' },
        // برای بستنِ کل‌روز همه‌ی ساعت‌های آن روز مهم‌اند؛ برای بستنِ ساعتی فقط همان ساعت‌ها.
        ...(data.fullDay ? {} : { timeSlot: { in: hourly } }),
      },
      select: { code: true, date: true, timeSlot: true, customerName: true },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });

    if (fresh.length) await prisma.barberBlock.createMany({ data: fresh });
    return ok({ created: fresh.length, conflicts }, { status: 201 });
  } catch (e) {
    log.error('POST blocks failed', e);
    return serverError();
  }
}
