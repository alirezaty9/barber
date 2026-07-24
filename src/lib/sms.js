// ─────────────────────────────────────────────────────────────
//  لایه‌ی ارسالِ پیامک (SMS) — زیرساختِ آماده برای وصل‌کردنِ پنلِ واقعی.
//
//  🎯 هدفِ طراحی: کلِ اپ فقط دو تابعِ زیر را صدا می‌زند و از «پنل» بی‌خبر است:
//        sendSms({ phone, message })     ← پیامکِ متنِ آزاد
//        sendOtpSms({ phone, code })     ← پیامکِ کدِ تأیید (OTP)
//     وقتی پنلِ پیامکت را خریدی، فقط کافی است:
//        ۱) متغیرهای محیطی (.env / Vercel) را پر کنی، و
//        ۲) بدنه‌ی یکی از providerها (مثلاً kavenegar) را کامل کنی.
//     هیچ جای دیگری از کد لازم نیست تغییر کند.
//
//  ⚙️ انتخابِ provider با متغیرِ محیطیِ SMS_PROVIDER انجام می‌شود:
//        SMS_PROVIDER=console    → فقط در لاگِ سرور چاپ می‌کند (حالتِ توسعه/پیش‌فرض)
//        SMS_PROVIDER=kavenegar  → کاوه‌نگار (نمونه‌ی آماده؛ کلید را در env بگذار)
//        SMS_PROVIDER=custom     → قلابِ عمومی برای هر پنلِ دیگر (بدنه را پر کن)
//
//  🔑 متغیرهای محیطیِ لازم (بسته به provider):
//        SMS_PROVIDER        نام provider
//        SMS_API_KEY         کلیدِ APIِ پنل
//        SMS_SENDER          شماره/خطِ ارسال (اگر پنل نیاز دارد)
//        SMS_OTP_TEMPLATE    نامِ قالبِ OTP (پنل‌های ایرانی معمولاً «لوکاپ/الگو» دارند)
// ─────────────────────────────────────────────────────────────
import { createLogger } from './logger';

const log = createLogger('sms');

const PROVIDER = process.env.SMS_PROVIDER || 'console';
const API_KEY = process.env.SMS_API_KEY || '';
const SENDER = process.env.SMS_SENDER || '';
const OTP_TEMPLATE = process.env.SMS_OTP_TEMPLATE || '';

// نتیجه‌ی یکنواختِ همه‌ی providerها: { ok, simulated?, error? }

// ── Provider: console (توسعه) ─────────────────────────────────
// هیچ پیامکِ واقعی نمی‌فرستد؛ فقط لاگ می‌کند. کد در لاگ دیده می‌شود تا تست کنی.
async function viaConsole({ phone, message }) {
  log.info(`SMS → ${phone}: ${message}`);
  return { ok: true, simulated: true };
}

// ── Provider: kavenegar (نمونه‌ی آماده‌ی پنلِ ایرانی) ─────────────
// کاوه‌نگار یک سرویسِ پیامکِ ایرانی است. برای OTP از «لوکاپ/الگو» استفاده می‌شود:
// یک قالب در پنل می‌سازی (مثلاً otp که متنش «کد شما %token است») و اینجا token را می‌فرستی.
async function viaKavenegar({ phone, message, otp }) {
  if (!API_KEY) return { ok: false, error: 'SMS_API_KEY تنظیم نشده است.' };
  try {
    if (otp && OTP_TEMPLATE) {
      // ارسالِ OTP با لوکاپ (توصیه‌شده برای کدِ تأیید).
      const url = `https://api.kavenegar.com/v1/${API_KEY}/verify/lookup.json`
        + `?receptor=${encodeURIComponent(otp.phone)}`
        + `&token=${encodeURIComponent(otp.code)}`
        + `&template=${encodeURIComponent(OTP_TEMPLATE)}`;
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json().catch(() => ({}));
      const okCode = json?.return?.status === 200;
      return okCode ? { ok: true } : { ok: false, error: json?.return?.message || 'ارسالِ پیامک ناموفق بود.' };
    }
    // ارسالِ پیامکِ متنِ آزاد.
    const url = `https://api.kavenegar.com/v1/${API_KEY}/sms/send.json`
      + `?receptor=${encodeURIComponent(phone)}`
      + `&message=${encodeURIComponent(message)}`
      + (SENDER ? `&sender=${encodeURIComponent(SENDER)}` : '');
    const res = await fetch(url, { method: 'GET' });
    const json = await res.json().catch(() => ({}));
    const okCode = json?.return?.status === 200;
    return okCode ? { ok: true } : { ok: false, error: json?.return?.message || 'ارسالِ پیامک ناموفق بود.' };
  } catch (e) {
    log.error('kavenegar send failed', e);
    return { ok: false, error: 'خطا در ارتباط با سرویسِ پیامک.' };
  }
}

// ── Provider: custom (قلابِ عمومی) ────────────────────────────
// اگر پنلت کاوه‌نگار نیست، فقط این تابع را طبقِ مستندِ پنلِ خودت پر کن.
async function viaCustom({ phone, message, otp }) {
  if (!API_KEY) return { ok: false, error: 'SMS_API_KEY تنظیم نشده است.' };
  // TODO(sms): درخواستِ HTTP به پنلِ خودت را اینجا بزن و { ok } را برگردان.
  // نمونه:
  //   const res = await fetch('https://panel.example.com/api/send', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
  //     body: JSON.stringify({ to: phone, text: message, from: SENDER }),
  //   });
  //   return { ok: res.ok };
  void phone; void message; void otp;
  log.warn('SMS_PROVIDER=custom است ولی بدنه‌ی viaCustom هنوز پیاده‌سازی نشده.');
  return { ok: false, error: 'provider سفارشی هنوز پیکربندی نشده است.' };
}

function pickProvider() {
  switch (PROVIDER) {
    case 'kavenegar': return viaKavenegar;
    case 'custom': return viaCustom;
    case 'console':
    default: return viaConsole;
  }
}

/** ارسالِ پیامکِ متنِ آزاد. خروجی: { ok, simulated?, error? } */
export async function sendSms({ phone, message }) {
  return pickProvider()({ phone, message });
}

/**
 * ارسالِ کدِ تأییدِ لغو (OTP). در حالتِ console فقط لاگ می‌کند؛ در providerهای واقعی
 * از قالب/لوکاپِ اختصاصیِ OTP استفاده می‌شود (بهتر از پیامکِ متنِ آزاد برای کدها).
 */
export async function sendOtpSms({ phone, code }) {
  const message = `کد تأیید لغو نوبت شما: ${code}`;
  const provider = pickProvider();
  return provider({ phone, message, otp: { phone, code } });
}
