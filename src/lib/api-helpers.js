import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isAuthenticated } from './auth';

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
