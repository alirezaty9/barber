import { prisma } from '@/lib/db';
import { PENDING_HOLD_MS } from '@/lib/availability-server';
import { ok, guardCron, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:expire-pending');

// GET /api/cron/expire-pending
// جاروکشِ رزروهای رهاشده: رزروی که مشتری برای پرداخت ساخته ولی هرگز پرداخت نکرده و
// callback هم نیامده، تا ابد pending می‌ماند و اسلات را می‌گیرد. اینجا رکوردهای کهنه‌ی
// (pending && unpaid && قدیمی‌تر از PENDING_HOLD_MS) را به cancelled/failed تبدیل می‌کنیم.
//
// امنیت: فقط با CRON_SECRET قابلِ اجراست (رجوع به guardCron در src/lib/api-helpers.js).
// رمز هم از هدرِ Authorization پذیرفته می‌شود و هم از پارامترِ ?secret= — تا با هر سرویسِ
// کرونی کار کند. اگر CRON_SECRET تنظیم نشده باشد، مسیر برای همه بسته است.
export async function GET(request) {
  const denied = guardCron(request);
  if (denied) return denied;

  try {
    const cutoff = new Date(Date.now() - PENDING_HOLD_MS);
    const result = await prisma.booking.updateMany({
      where: {
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: { lt: cutoff },
      },
      data: { status: 'cancelled', paymentStatus: 'failed' },
    });
    if (result.count > 0) log.info(`${result.count} رزروِ رهاشده باطل شد.`);
    return ok({ expired: result.count });
  } catch (e) {
    log.error('expire-pending failed', e);
    return serverError();
  }
}
