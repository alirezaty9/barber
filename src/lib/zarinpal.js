// لایه‌ی سرویس درگاه پرداخت زرین‌پال (API نسخه ۴) — مستقل از UI و مسیرها.
// در حالت sandbox روی محیط تستی زرین‌پال کار می‌کند (بدون تراکنش واقعی) و با
// خاموش‌کردن ZARINPAL_SANDBOX به درگاه واقعی سوییچ می‌شود.
//
// مبالغ به «تومان» (currency: IRT) ارسال می‌شوند چون قیمت خدمات در دیتابیس تومان است.

const IS_SANDBOX = process.env.ZARINPAL_SANDBOX === 'true';
const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || '';

// در sandbox هم API و هم صفحه‌ی پرداخت روی دامنه‌ی sandbox است.
const API_BASE = IS_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/v4/payment'
  : 'https://api.zarinpal.com/pg/v4/payment';

const STARTPAY_BASE = IS_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/StartPay'
  : 'https://www.zarinpal.com/pg/StartPay';

// توکن دسترسیِ استرداد (متفاوت با merchant_id). استرداد واقعیِ زرین‌پال فقط با این توکن
// انجام می‌شود؛ اگر تنظیم نشده باشد، استرداد به‌صورت «حسابداری» ثبت می‌شود ولی پول واقعی
// جابه‌جا نمی‌شود (برای محیط تست/بدون توکن).
const ACCESS_TOKEN = process.env.ZARINPAL_ACCESS_TOKEN || '';

/**
 * درخواست شروع پرداخت. در صورت موفقیت authority و آدرس ری‌دایرکت به درگاه را برمی‌گرداند.
 * @param {{amount:number, description:string, callbackUrl:string, mobile?:string}} p
 * @returns {Promise<{ok:boolean, authority?:string, url?:string, error?:string}>}
 */
export async function requestPayment({ amount, description, callbackUrl, mobile }) {
  // حالت تستی/فیک: اگر Merchant ID تنظیم نشده باشد، به‌جای اتصال واقعی، یک پرداختِ
  // شبیه‌سازی‌شده‌ی موفق می‌سازیم و مستقیم به callback خودمان با Status=OK برمی‌گردیم.
  if (!MERCHANT_ID) {
    const authority = 'MOCK-' + Math.random().toString(36).slice(2, 12).toUpperCase();
    const sep = callbackUrl.includes('?') ? '&' : '?';
    return { ok: true, authority, url: `${callbackUrl}${sep}Authority=${authority}&Status=OK`, mock: true };
  }
  try {
    const res = await fetch(`${API_BASE}/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        merchant_id: MERCHANT_ID,
        amount,
        currency: 'IRT',
        description,
        callback_url: callbackUrl,
        metadata: mobile ? { mobile } : undefined,
      }),
    });
    const json = await res.json();
    const authority = json?.data?.authority;
    if (json?.data?.code === 100 && authority) {
      return { ok: true, authority, url: `${STARTPAY_BASE}/${authority}` };
    }
    const err = Array.isArray(json?.errors) ? json.errors[0] : json?.errors;
    return { ok: false, error: err?.message || 'اتصال به درگاه پرداخت ناموفق بود.' };
  } catch {
    return { ok: false, error: 'خطا در ارتباط با درگاه پرداخت.' };
  }
}

/**
 * تأیید نهاییِ پرداخت پس از بازگشت کاربر از درگاه.
 * @param {{amount:number, authority:string}} p
 * @returns {Promise<{ok:boolean, refId?:string, error?:string}>}
 */
export async function verifyPayment({ amount, authority }) {
  // حالت تستی/فیک: بدون Merchant ID، تأیید همیشه موفق است با یک کد پیگیریِ ساختگی.
  if (!MERCHANT_ID) {
    return { ok: true, refId: 'MOCK' + Math.floor(Math.random() * 900000 + 100000) };
  }
  try {
    const res = await fetch(`${API_BASE}/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ merchant_id: MERCHANT_ID, amount, authority }),
    });
    const json = await res.json();
    const code = json?.data?.code;
    // 100 = تأیید موفق، 101 = قبلاً تأیید شده (هر دو یعنی پرداخت انجام شده).
    if (code === 100 || code === 101) {
      return { ok: true, refId: String(json?.data?.ref_id ?? '') };
    }
    const err = Array.isArray(json?.errors) ? json.errors[0] : json?.errors;
    return { ok: false, error: err?.message || 'تأیید پرداخت ناموفق بود.' };
  } catch {
    return { ok: false, error: 'خطا در تأیید پرداخت.' };
  }
}

/**
 * استرداد وجه (کامل یا جزئی). بدون ZARINPAL_ACCESS_TOKEN فقط «حسابداری» ثبت می‌شود
 * (simulated: true) و پول واقعی جابه‌جا نمی‌شود؛ با توکن، درخواست استرداد واقعی زده می‌شود.
 * @param {{amount:number, authority?:string, description?:string}} p
 * @returns {Promise<{ok:boolean, simulated?:boolean, refundId?:string, error?:string}>}
 */
export async function refundPayment({ amount, authority, description }) {
  if (!ACCESS_TOKEN) {
    return { ok: true, simulated: true };
  }
  try {
    const res = await fetch('https://api.zarinpal.com/pg/v4/refund.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ merchant_id: MERCHANT_ID, authority, amount, description }),
    });
    const json = await res.json();
    if (json?.data?.code === 100 || json?.data?.id) {
      return { ok: true, simulated: false, refundId: String(json?.data?.id ?? json?.data?.ref_id ?? '') };
    }
    const err = Array.isArray(json?.errors) ? json.errors[0] : json?.errors;
    return { ok: false, error: err?.message || 'استرداد ناموفق بود.' };
  } catch {
    return { ok: false, error: 'خطا در ارتباط با سرویس استرداد.' };
  }
}
