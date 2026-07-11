import { createLogger } from '@/lib/logger';

const log = createLogger('http');

// رپر کوچک روی fetch برای APIهای داخلی: در صورت خطا، پیام فارسیِ سرور را throw می‌کند.
// هر درخواست با متد، وضعیت و مدت‌زمان لاگ می‌شود (درخواستِ کندتر از ۸۰۰ms هشدار می‌گیرد).
export async function http(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const start = performance.now();

  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  let body = null;
  try {
    body = await res.json();
  } catch {
    // پاسخ بدون بدنه
  }

  const ms = performance.now() - start;

  if (!res.ok) {
    const message = body?.error || 'خطایی رخ داد. دوباره تلاش کنید.';
    log.error(`${method} ${path} → ${res.status} (${ms.toFixed(0)}ms)`, message);
    const error = new Error(message);
    error.status = res.status;
    error.details = body?.details;
    throw error;
  }

  log[ms > 800 ? 'warn' : 'debug'](`${method} ${path} → ${res.status} (${ms.toFixed(0)}ms)`);
  return body;
}
