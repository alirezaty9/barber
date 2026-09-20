import { prisma } from '@/lib/db';
import { barberSchema } from '@/lib/validation';
import { serializeBarber, workDaysToCsv } from '@/lib/serializers';
import { ok, guardAdmin, parseBody, notFound, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('barbers:id');

export async function PATCH(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, response } = await parseBody(request, barberSchema.partial());
  if (response) return response;

  // اگر workDays در بدنه آمده، آن را به CSV تبدیل کن؛ وگرنه دست نزن.
  const payload = { ...data };
  if (Array.isArray(data.workDays)) payload.workDays = workDaysToCsv(data.workDays);

  try {
    const barber = await prisma.barber.update({ where: { id }, data: payload });
    return ok(serializeBarber(barber));
  } catch (e) {
    if (e?.code === 'P2025') return notFound('آرایشگر موردنظر یافت نشد.');
    log.error('PATCH barber failed', e);
    return serverError();
  }
}

// 🧹 مسیرِ DELETE در ۱۴۰۵/۰۶/۲۸ حذف شد.
//
// چرا؟ پروژه تک‌آرایشگره است و هیچ صفحه‌ای این مسیر را صدا نمی‌زد — ولی باز بود و خطرش
// واقعی: با حذفِ آرایشگر، رابطه‌ی نوبت‌ها با او «خالی» می‌شد، محاسبه‌ی موجودی (که همیشه
// بر اساسِ یک آرایشگرِ مشخص می‌گردد) دیگر آن نوبت‌ها را نمی‌دید، و همان ساعت‌ها دوباره به
// مشتریِ جدید فروخته می‌شد. قفلِ یکتایِ دیتابیس هم جلویش را نمی‌گرفت.
// (مسیرِ POST عمداً نگه داشته شد: تنها راهِ بازسازیِ آرایشگر اگر روزی رکوردش از بین برود.)
