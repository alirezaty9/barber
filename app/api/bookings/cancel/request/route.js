import { prisma } from '@/lib/db';
import { cancelRequestSchema } from '@/lib/validation';
import { ok, parseBody, notFound, conflict, serverError, tooManyRequests } from '@/lib/api-helpers';
import { generateOtp, hashOtp, OTP_TTL_MS } from '@/lib/otp';
import { sendSms } from '@/lib/sms';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('cancel:otp');

// نمایشِ ماسک‌شده‌ی موبایل برای UI: «۰۹۱۲***۷۸۹».
function maskPhone(phone) {
  if (!phone || phone.length < 6) return '***';
  return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
}

// POST — درخواستِ کدِ تأییدِ لغو. سرور یک OTP می‌سازد، hash آن را روی نوبت ذخیره می‌کند
// و کد را به موبایلِ همان نوبت «می‌فرستد» (فعلاً فقط در کنسول/لاگ چاپ می‌شود؛ رجوع به src/lib/sms.js).
export async function POST(request) {
  // ضدِ سوءاستفاده: حداکثر ۵ درخواستِ کد در هر ۵ دقیقه به‌ازای هر IP.
  const limit = rateLimit({ key: `cancel-otp:${clientIp(request)}`, limit: 5, windowMs: 5 * 60_000 });
  if (!limit.ok) return tooManyRequests('درخواست‌های زیاد. چند دقیقه بعد دوباره تلاش کنید.');

  const { data, response } = await parseBody(request, cancelRequestSchema);
  if (response) return response;

  try {
    const booking = await prisma.booking.findUnique({ where: { code: data.code.trim() } });
    if (!booking) return notFound('نوبتی با این کد یافت نشد.');
    if (booking.status === 'cancelled') return conflict('این نوبت قبلاً لغو شده است.');

    const otp = generateOtp();
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        cancelOtpHash: hashOtp(otp),
        cancelOtpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        cancelOtpAttempts: 0,
      },
    });

    // ارسالِ کد به موبایلِ مشتری (لایه‌ی sms فعلاً فقط لاگ می‌کند).
    await sendSms({
      phone: booking.customerPhone,
      message: `کد تأیید لغو نوبت ${booking.code}: ${otp}`,
    });
    // ⚠️ چاپِ خیلی واضح در کنسولِ سرور برای تست — بدونِ فیلترِ سطحِ لاگ (همیشه دیده می‌شود).
    // بعد از وصل‌شدنِ سامانه‌ی پیامکِ واقعی، این بلاک را می‌توان حذف کرد.
    console.log('\n┌───────────── کد تأیید لغو نوبت (تست) ─────────────');
    console.log(`│  کد:     ${otp}`);
    console.log(`│  نوبت:   ${booking.code}`);
    console.log(`│  موبایل: ${booking.customerPhone}`);
    console.log('└──────────────────────────────────────────────────\n');
    log.info(`کد تأیید لغو نوبت ${booking.code} (موبایل ${booking.customerPhone}) → ${otp}`);

    // خودِ کد هرگز به کلاینت برنمی‌گردد؛ فقط شماره‌ی ماسک‌شده برای نمایش.
    return ok({ success: true, phoneMasked: maskPhone(booking.customerPhone) });
  } catch (e) {
    log.error('request cancel otp failed', e);
    return serverError();
  }
}
