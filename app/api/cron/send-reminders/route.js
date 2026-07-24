import { prisma } from '@/lib/db';
import { sendSms } from '@/lib/sms';
import { tehranTodayISO, shiftISO } from '@/lib/time';
import { servicesLabelOf } from '@/lib/serializers';
import { ok, unauthorized, serverError } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron:send-reminders');

// ایران UTC+3:30 است (بدونِ ساعتِ تابستانی از ۲۰۲۲). برای تبدیلِ ساعتِ دیواریِ نوبت
// (که به وقتِ ایران است) به «لحظه‌ی مطلق» (UTC) این مقدار را کم می‌کنیم.
const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// لحظه‌ی مطلقِ (UTC ms) شروعِ نوبت از روی date (YYYY-MM-DD) و timeSlot (HH:MM) به وقتِ ایران.
function appointmentMs(dateIso, timeSlot) {
  const [y, mo, d] = dateIso.split('-').map(Number);
  const [hh, mm] = timeSlot.split(':').map(Number);
  return Date.UTC(y, mo - 1, d, hh, mm) - TEHRAN_OFFSET_MS;
}

// GET /api/cron/send-reminders
// هر نوبتِ «تاییدشده» که تا ۲ ساعتِ آینده شروع می‌شود و هنوز یادآوری برایش نرفته را
// یک پیامکِ یادآوری (با همان سیستمِ SMS) می‌فرستد و علامت می‌زند تا تکرار نشود.
//
// امنیت: فقط با CRON_SECRET. Vercel Cron هدرِ Authorization: Bearer <CRON_SECRET> را
// خودکار می‌فرستد اگر CRON_SECRET در Environment Variables ست شده باشد.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) return unauthorized();

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
      const diff = appointmentMs(b.date, b.timeSlot) - now;
      return diff > 0 && diff <= TWO_HOURS_MS;
    });

    let sent = 0;
    for (const b of due) {
      const label = servicesLabelOf(b);
      const message =
        `${b.customerName} عزیز، یادآوری نوبت «${label}» امروز ساعت ${b.timeSlot} در banad barber. کد رهگیری: ${b.code}`;

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
