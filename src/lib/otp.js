// تولید و راستی‌آزماییِ کدِ تأییدِ دومرحله‌ای (OTP).
// کد به‌صورتِ hash روی رکوردِ نوبت ذخیره می‌شود؛ خودِ کدِ خام هرگز در DB نمی‌ماند.
//
// 🔑 چرا HMAC و نه sha256ِ خالی؟ فضای کد فقط ۹۰۰٬۰۰۰ حالت است. یک hashِ بی‌کلید از این فضا
// در کسری از ثانیه با شمارشِ همه‌ی حالت‌ها برگشت‌پذیر است؛ یعنی اگر روزی نسخه‌ی پشتیبانِ
// دیتابیس جایی نشت کند، کدها از hashشان بازسازی می‌شوند. HMAC با کلیدِ سرور این را ناممکن
// می‌کند، چون مهاجم بدونِ کلید نمی‌تواند hashِ حالت‌ها را بسازد.
import { createHmac, randomInt } from 'crypto';

export const OTP_TTL_MS = 2 * 60 * 1000; // اعتبارِ کد: ۲ دقیقه
export const OTP_MAX_ATTEMPTS = 5; // حداکثر تلاشِ اشتباه پیش از باطل‌شدنِ کد
export const OTP_LENGTH = 6; // طولِ کد (۶ رقم → فضای ۹۰۰٬۰۰۰ حالت، مقاوم‌تر در برابرِ حدس)

// کدِ ۶ رقمیِ عددی با randomInt (امن، نه Math.random) — بازه‌ی ۱۰۰۰۰۰ تا ۹۹۹۹۹۹.
export function generateOtp() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(otp) {
  const key = process.env.SESSION_SECRET;
  if (!key) throw new Error('SESSION_SECRET تعریف نشده است (برای hashِ کدِ تأیید لازم است).');
  return createHmac('sha256', key).update(String(otp)).digest('hex');
}
