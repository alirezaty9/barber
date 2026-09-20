import { prisma } from '@/lib/db';
import { sendSms } from '@/lib/sms';
import { SMS_ENABLED } from '@/lib/features';
import { tehranTodayISO, shiftISO, appointmentStartMs } from '@/lib/time';
import { servicesLabelOf } from '@/lib/serializers';
import { SHOP_NAME } from '@/lib/shop';
import { ok, guardCron, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:send-reminders');

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// GET /api/cron/send-reminders
// هر نوبتِ «تاییدشده» که تا ۲ ساعتِ آینده شروع می‌شود و هنوز یادآوری برایش نرفته را
// یک پیامکِ یادآوری (با همان سیستمِ SMS) می‌فرستد و علامت می‌زند تا تکرار نشود.
//
// امنیت: فقط با CRON_SECRET قابلِ اجراست (رجوع به guardCron در src/lib/api-helpers.js).
// رمز هم از هدرِ Authorization پذیرفته می‌شود و هم از پارامترِ ?secret=.
export async function GET(request) {
  const denied = guardCron(request);
  if (denied) return denied;

  // ⏸️ تعلیقِ موقت: تا فعال‌شدنِ پنلِ پیامک، این کرون بی‌سر‌و‌صدا رد می‌شود. هیچ نوبتی
  // «یادآوری‌شده» علامت نمی‌خورد تا بعد از روشن‌کردنِ پیامک، یادآوری‌ها از دست نروند.
  if (!SMS_ENABLED) return ok({ skipped: true, reason: 'sms-disabled' });

  try {
    const now = Date.now();

    // کاندیداها: نوبت‌های تاییدشده‌ی امروز/فردا (به وقتِ ایران) که یادآوری نشده‌اند.
    // بازه‌ی امروز+فردا کافی است چون «تا ۲ ساعتِ آینده» همیشه در همین دو روز می‌افتد.
    const today = tehranTodayISO();
    const tomorrow = shiftISO(today, 1);
    const candidates = await prisma.booking.findMany({
      where: {
        status: 'confirmed',
        reminderSentAt: null,
        date: { in: [today, tomorrow] },
      },
      include: { service: true, service2: true },
    });

    // فقط آن‌هایی که «هنوز نشده‌اند» و «تا ۲ ساعتِ دیگر یا کمتر» شروع می‌شوند.
    const due = candidates.filter((b) => {
      const diff = appointmentStartMs(b.date, b.timeSlot) - now;
      return diff > 0 && diff <= TWO_HOURS_MS;
    });

    let sent = 0;
    for (const b of due) {
      const label = servicesLabelOf(b);
      const message =
        `${b.customerName} عزیز، یادآوری نوبت «${label}» امروز ساعت ${b.timeSlot} در ${SHOP_NAME}. کد رهگیری: ${b.code}`;

      const res = await sendSms({ phone: b.customerPhone, message });
      if (res.ok) {
        // بعد از ارسالِ موفق علامت می‌زنیم تا در اجرای بعدیِ کرون دوباره نرود.
        await prisma.booking.update({
          where: { id: b.id },
          data: { reminderSentAt: new Date() },
        });
        sent += 1;
      } else {
        log.error(`ارسالِ یادآوری برای ${b.code} ناموفق بود: ${res.error}`);
      }
    }

    if (sent > 0) log.info(`${sent} پیامکِ یادآوری ارسال شد.`);
    return ok({ candidates: candidates.length, due: due.length, sent });
  } catch (e) {
    log.error('send-reminders failed', e);
    return serverError();
  }
}
