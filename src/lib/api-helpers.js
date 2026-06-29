import { NextResponse } from 'next/server';
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

/** تولید کد رهگیریِ خوانا. */
export function generateBookingCode() {
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return `BK${rand}`;
}
