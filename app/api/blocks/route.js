import { prisma } from '@/lib/db';
import { blockSchema } from '@/lib/validation';
import { ok, guardAdmin, parseBody, badRequest, serverError } from '@/lib/api-helpers';

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
  } catch {
    return serverError();
  }
}

// فهرست تاریخ‌های ISO از date تا dateTo (شامل هر دو). اگر dateTo نباشد فقط همان یک روز.
function dateRange(fromIso, toIso) {
  const out = [];
  const start = new Date(`${fromIso}T00:00:00`);
  const end = new Date(`${(toIso || fromIso)}T00:00:00`);
  if (end < start) return [fromIso];
  // سقف ایمنی ۹۰ روز تا از حلقه‌ی بی‌پایان/ورودی نامعقول جلوگیری شود.
  for (let d = start, i = 0; d <= end && i < 90; d.setDate(d.getDate() + 1), i++) {
    out.push(d.toISOString().split('T')[0]);
  }
  return out;
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
      for (const date of dateRange(data.date, data.dateTo)) {
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
  } catch {
    return serverError();
  }
}
