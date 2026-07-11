import { prisma } from '@/lib/db';
import { blockSchema } from '@/lib/validation';
import { rangeISO } from '@/lib/time';
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

    if (fresh.length) await prisma.barberBlock.createMany({ data: fresh });
    return ok({ created: fresh.length }, { status: 201 });
  } catch (e) {
    log.error('POST blocks failed', e);
    return serverError();
  }
}
