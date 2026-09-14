import { NextResponse } from 'next/server';
import { randomBytes, timingSafeEqual } from 'crypto';
import { isAuthenticated } from './auth';
import { REFUNDS_ENABLED } from './features';

/** مقایسه‌ی دو رشته‌ی محرمانه به‌صورتِ constant-time (ضدِ timing attack). */
function secretsMatch(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function ok(data, init) {
  return NextResponse.json(data, init);
}

export function badRequest(message, details) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: 'دسترسی غیرمجاز.' }, { status: 401 });
}

export function notFound(message = 'یافت نشد.') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message = 'خطای داخلی سرور.') {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function tooManyRequests(message = 'درخواست‌های زیاد. کمی بعد دوباره تلاش کنید.') {
  return NextResponse.json({ error: message }, { status: 429 });
}

/** قابلیتی که عمداً و موقتاً خاموش شده (نه خرابی) — ۵۰۳ Service Unavailable. */
export function serviceUnavailable(message = 'این قابلیت موقتاً غیرفعال است.') {
  return NextResponse.json({ error: message }, { status: 503 });
}

/**
 * خطای قابلِ‌تبدیل به پاسخِ HTTP — مخصوصاً برای throw از داخلِ تراکنش‌ها
 * تا کنترلِ جریانِ «چک شکست خورد → پاسخِ ۴۰۹/۴۰۰» به بیرونِ تراکنش منتقل شود.
 */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
  toResponse() {
    return NextResponse.json({ error: this.message, details: this.details }, { status: this.status });
  }
}

/** اگر کاربر ادمین نباشد یک Response 401 برمی‌گرداند؛ در غیر این صورت null. */
export async function guardAdmin() {
  const authed = await isAuthenticated();
  return authed ? null : unauthorized();
}

/**
 * گاردِ مسیرهای کرون — اگر درخواست معتبر نباشد Response 401 برمی‌گرداند، وگرنه null.
 *
 * رمز از دو راه پذیرفته می‌شود، چون هر سرویسِ کرون امکاناتِ متفاوتی دارد:
 *   ۱) هدرِ `Authorization: Bearer <CRON_SECRET>` — راهِ ترجیحی و امن‌تر، چون رمز
 *      در آدرس نمی‌آید و در لاگِ دسترسیِ سرور ثبت نمی‌شود.
 *   ۲) پارامترِ آدرسِ `?secret=<CRON_SECRET>` — راهِ جایگزین برای سرویس‌هایی که
 *      امکانِ فرستادنِ هدرِ دلخواه ندارند یا متغیرِ محیطی را داخلِ دستور جا نمی‌اندازند.
 *
 * ⚠️ راهِ دوم را فقط وقتی به کار ببر که راهِ اول جواب نداد: رمزی که در آدرس می‌آید
 *    ممکن است در لاگِ دسترسیِ سرور ذخیره شود.
 *
 * هر دو مقایسه constant-time است تا از روی زمانِ پاسخ نشود رمز را حدس زد.
 */
export function guardCron(request) {
  const secret = process.env.CRON_SECRET;
  // بدونِ رمزِ تنظیم‌شده، مسیر کاملاً بسته است (fail-closed) — نه باز برای همه.
  if (!secret) return unauthorized();

  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ') && secretsMatch(header.slice(7), secret)) return null;

  const fromQuery = new URL(request.url).searchParams.get('secret');
  if (fromQuery && secretsMatch(fromQuery, secret)) return null;

  return unauthorized();
}

/** اعتبارسنجی بدنه با یک اسکیمای zod؛ خروجی { data } یا { response } خطا. */
export async function parseBody(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    return { response: badRequest('بدنه‌ی درخواست نامعتبر است.') };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    return { response: badRequest(first?.message || 'داده‌ی نامعتبر.', result.error.flatten()) };
  }
  return { data: result.data };
}

/** تولید کد رهگیریِ خوانا با تصادفِ رمزنگارانه (نه Math.random) — چون این کد اعتبارنامه‌ی لغو است. */
export function generateBookingCode() {
  const rand = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `BK${rand}`;
}

/**
 * محاسبه‌ی patch لغو نوبت + استرداد.
 * قاعده: اگر «مشتری» لغو کند ۵۰٪ و اگر «ادمین/آرایشگر» لغو کند ۱۰۰٪ مبلغِ پرداخت‌شده مسترد می‌شود.
 * فقط نوبت‌های «پرداخت‌شده» مشمول استرداد هستند.
 * @param {{paymentStatus:string, amount:number}} booking
 * @param {'customer'|'admin'} cancelledBy
 */
export function buildCancelPatch(booking, cancelledBy) {
  const patch = { status: 'cancelled', cancelledBy };
  if (booking.paymentStatus === 'paid' && booking.amount > 0) {
    const ratio = cancelledBy === 'admin' ? 1 : 0.5;
    patch.paymentStatus = 'refunded';
    patch.refundAmount = Math.floor(booking.amount * ratio);
  }
  return patch;
}

/**
 * patchِ نهاییِ لغو — همان قاعده‌ی بالا، ولی با درنظرگرفتنِ کلیدِ «استرداد فعال است یا نه».
 *
 * ⏸️ وقتی استرداد تعلیق است (پیش‌فرضِ فعلی)، نوبت فقط «لغو» می‌شود و هیچ ادعای استرداد
 * ثبت نمی‌شود؛ وضعیتِ پرداخت همان «پرداخت‌شده» می‌ماند تا پنل واقعیت را نشان دهد.
 * قاعده‌ی درصدها در buildCancelPatch دست‌نخورده می‌ماند تا با روشن‌شدنِ کلید برگردد.
 * هر جای اپ که نوبتی را لغو می‌کند باید همین تابع را صدا بزند، نه buildCancelPatch را.
 */
export function resolveCancelPatch(booking, cancelledBy) {
  if (!REFUNDS_ENABLED) return { status: 'cancelled', cancelledBy };
  return buildCancelPatch(booking, cancelledBy);
}
