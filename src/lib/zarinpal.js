// لایه‌ی سرویس درگاه پرداخت زرین‌پال (API نسخه ۴) — مستقل از UI و مسیرها.
// در حالت sandbox روی محیط تستی زرین‌پال کار می‌کند (بدون تراکنش واقعی) و با
// خاموش‌کردن ZARINPAL_SANDBOX به درگاه واقعی سوییچ می‌شود.
//
// مبالغ به «تومان» (currency: IRT) ارسال می‌شوند چون قیمت خدمات در دیتابیس تومان است.

const IS_SANDBOX = process.env.ZARINPAL_SANDBOX === 'true';
const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || '';
// حالتِ mock فقط با فلگِ صریحِ ALLOW_MOCK_PAYMENT=true فعال می‌شود — نه صرفاً با نبودِ Merchant ID.
// این‌طور نبودِ merchant به‌جای «رزروِ رایگانِ خاموش» به خطا منجر می‌شود (fail-closed).
// 🔴 حالتِ mock در پروداکشن حتی با فلگِ روشن هم فعال نمی‌شود. دلیل: اگر روزی نامِ متغیرِ
// merchant روی پنلِ هاست غلط تایپ شود و این فلگ هم روشن مانده باشد، هر رزرو بدونِ هیچ
// پرداختی «موفق» ثبت می‌شد — و هیچ خطایی هم دیده نمی‌شد. این قید آن حالت را غیرممکن می‌کند.
const ALLOW_MOCK = process.env.ALLOW_MOCK_PAYMENT === 'true' && process.env.NODE_ENV !== 'production';
const USE_MOCK = !MERCHANT_ID && ALLOW_MOCK;

// اگر نه merchant داریم و نه اجازه‌ی mock، هر تلاشِ پرداخت باید با خطا رد شود.
function assertConfigured() {
  if (!MERCHANT_ID && !ALLOW_MOCK) {
    throw new Error('ZARINPAL_MERCHANT_ID تنظیم نشده و ALLOW_MOCK_PAYMENT هم فعال نیست — پرداخت غیرممکن است.');
  }
}

// در sandbox هم API و هم صفحه‌ی پرداخت روی دامنه‌ی sandbox است.
const API_BASE = IS_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/v4/payment'
  : 'https://api.zarinpal.com/pg/v4/payment';

const STARTPAY_BASE = IS_SANDBOX
  ? 'https://sandbox.zarinpal.com/pg/StartPay'
  : 'https://www.zarinpal.com/pg/StartPay';

// توکن دسترسیِ استرداد (متفاوت با merchant_id). استردادِ واقعیِ زرین‌پال فقط با این توکن
// انجام می‌شود. 🔴 اگر تنظیم نشده باشد، استرداد **شکست** می‌خورد (نه «موفقیتِ حسابداری»):
// رفتارِ قبلی ok:true برمی‌گرداند و مصرف‌کننده‌ها آن را «مسترد شد» ثبت می‌کردند، در حالی که
// هیچ ریالی جابه‌جا نشده بود — یعنی سیستم به صاحبِ کسب‌وکار و به مشتری دروغ می‌گفت.
const ACCESS_TOKEN = process.env.ZARINPAL_ACCESS_TOKEN || '';

/**
 * درخواست شروع پرداخت. در صورت موفقیت authority و آدرس ری‌دایرکت به درگاه را برمی‌گرداند.
 * @param {{amount:number, description:string, callbackUrl:string, mobile?:string}} p
 * @returns {Promise<{ok:boolean, authority?:string, url?:string, error?:string}>}
 */
export async function requestPayment({ amount, description, callbackUrl, mobile }) {
  assertConfigured();
  // حالت تستی/فیک (فقط وقتی ALLOW_MOCK_PAYMENT=true): به‌جای اتصال واقعی، یک پرداختِ
  // شبیه‌سازی‌شده‌ی موفق می‌سازیم و مستقیم به callback خودمان با Status=OK برمی‌گردیم.
  if (USE_MOCK) {
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
  assertConfigured();
  // حالت تستی/فیک (فقط وقتی ALLOW_MOCK_PAYMENT=true): تأیید همیشه موفق با کد پیگیریِ ساختگی.
  if (USE_MOCK) {
    return { ok: true, refId: 'MOCK' + Math.floor(Math.random() * 900000 + 100000), paidAmount: amount };
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
      // مبلغِ واقعیِ تأییدشده را هم برمی‌گردانیم تا route با مبلغِ رزرو مقایسه کند.
      const paidAmount = typeof json?.data?.amount === 'number' ? json.data.amount : null;
      return { ok: true, refId: String(json?.data?.ref_id ?? ''), paidAmount };
    }
    const err = Array.isArray(json?.errors) ? json.errors[0] : json?.errors;
    return { ok: false, error: err?.message || 'تأیید پرداخت ناموفق بود.' };
  } catch {
    return { ok: false, error: 'خطا در تأیید پرداخت.' };
  }
}

/**
 * استرداد وجه (کامل یا جزئی). fail-closed است: اگر امکانِ استردادِ واقعی نباشد، شکست
 * برمی‌گرداند تا فراخوان وضعیت را «در انتظار استرداد» ثبت کند، نه «مسترد شده».
 * @param {{amount:number, authority?:string, description?:string}} p
 * @returns {Promise<{ok:boolean, refundId?:string, error?:string}>}
 */
export async function refundPayment({ amount, authority, description }) {
  if (!ACCESS_TOKEN) {
    return { ok: false, error: 'توکنِ استردادِ زرین‌پال (ZARINPAL_ACCESS_TOKEN) تنظیم نشده است.' };
  }
  // سرویسِ استرداد فقط روی درگاهِ واقعی وجود دارد. در حالتِ تستی، Authorityِ سندباکس روی
  // سرورِ اصلی شناخته نمی‌شود؛ پس به‌جای فرستادنِ درخواستی که قطعاً خطا می‌دهد، صریح رد می‌کنیم.
  if (IS_SANDBOX) {
    return { ok: false, error: 'در حالتِ تستیِ درگاه، استردادِ وجه امکان‌پذیر نیست.' };
  }
  if (!authority) {
    return { ok: false, error: 'شناسه‌ی تراکنش برای استرداد موجود نیست.' };
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
      return { ok: true, refundId: String(json?.data?.id ?? json?.data?.ref_id ?? '') };
    }
    const err = Array.isArray(json?.errors) ? json.errors[0] : json?.errors;
    return { ok: false, error: err?.message || 'استرداد ناموفق بود.' };
  } catch {
    return { ok: false, error: 'خطا در ارتباط با سرویس استرداد.' };
  }
}
