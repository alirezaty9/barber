import { prisma } from '@/lib/db';
import { cancelRequestSchema } from '@/lib/validation';
import { ok, parseBody, notFound, conflict, serverError, tooManyRequests, serviceUnavailable } from '@/lib/api-helpers';
import { generateOtp, hashOtp, OTP_TTL_MS } from '@/lib/otp';
import { sendOtpSms } from '@/lib/sms';
import { SMS_ENABLED, SMS_DISABLED_MESSAGE } from '@/lib/features';
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
  // ⏸️ تعلیقِ موقت: تا وقتی پنلِ پیامک فعال نشده، کدِ تأیید قابلِ ارسال نیست.
  // این چک عمداً قبل از هر کاری است تا نه رکوردی در دیتابیس دست‌کاری شود نه سهمیه‌ی
  // rate limit مصرف شود. (رجوع به src/lib/features.js برای روشن‌کردنِ دوباره)
  if (!SMS_ENABLED) return serviceUnavailable(SMS_DISABLED_MESSAGE);

  // ضدِ سوءاستفاده (لایه‌ی اول): حداکثر ۵ درخواستِ کد در هر ۵ دقیقه به‌ازای هر IP.
  const ipLimit = rateLimit({ key: `cancel-otp:${clientIp(request)}`, limit: 5, windowMs: 5 * 60_000 });
  if (!ipLimit.ok) return tooManyRequests('درخواست‌های زیاد. چند دقیقه بعد دوباره تلاش کنید.');

  const { data, response } = await parseBody(request, cancelRequestSchema);
  if (response) return response;

  // ضدِ سوءاستفاده (لایه‌ی دوم): سقفِ صدورِ کد برای «هر کدِ رهگیری» — جلوی reset مکررِ
  // شمارنده‌ی تلاش برای دورزدنِ سقفِ per-booking و همچنین «بمبِ پیامکی» را می‌گیرد.
  const codeLimit = rateLimit({ key: `cancel-otp-code:${data.code.trim()}`, limit: 3, windowMs: 10 * 60_000 });
  if (!codeLimit.ok) return tooManyRequests('برای این نوبت به‌تازگی چند کد ارسال شده. کمی بعد تلاش کنید.');

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

    // ارسالِ کد به موبایلِ مشتری از طریقِ لایه‌ی SMS (provider با env انتخاب می‌شود).
    // در حالتِ SMS_PROVIDER=console فقط در لاگِ سرور دیده می‌شود؛ در پروداکشن پنلِ واقعی می‌فرستد.
    const sent = await sendOtpSms({ phone: booking.customerPhone, code: otp });
    if (!sent.ok) {
      log.error(`ارسالِ کد تأیید لغو نوبت ${booking.code} ناموفق بود: ${sent.error || 'unknown'}`);
      return serverError('ارسال کد تأیید ناموفق بود. کمی بعد دوباره تلاش کنید.');
    }

    // خودِ کد هرگز به کلاینت برنمی‌گردد؛ فقط شماره‌ی ماسک‌شده برای نمایش.
    return ok({ success: true, phoneMasked: maskPhone(booking.customerPhone) });
  } catch (e) {
    log.error('request cancel otp failed', e);
    return serverError();
  }
}
