// محدودکننده‌ی نرخِ ساده و درون‌حافظه‌ای (fixed-window).
//
// ⚠️ محدودیت: در محیطِ serverless (Vercel) هر instance حافظه‌ی خودش را دارد، پس این
// «best-effort» است نه سراسری. برای محافظتِ قویِ چنددستگاهی بعداً به یک استورِ مشترک
// (Upstash Redis / Vercel KV) مهاجرت کن؛ امضای rateLimit تغییری نمی‌کند.

const buckets = new Map();

export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.reset - now };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count };
}

// استخراجِ IP کلاینت از هدرهای رایجِ پروکسی.
export function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}
