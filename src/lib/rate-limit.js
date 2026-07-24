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

// استخراجِ IP کلاینت. روی Vercel هدرِ `x-real-ip` را خودِ پلتفرم ست می‌کند و قابلِ اعتمادتر از
// اولین مقدارِ `x-forwarded-for` است (که کلاینت می‌تواند جعلش کند). پس اول x-real-ip.
export function clientIp(request) {
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  // fallback: راست‌ترین هاپِ x-forwarded-for (نزدیک‌ترین پروکسیِ معتبر) کمتر قابلِ جعل است.
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || 'unknown';
  }
  return 'unknown';
}
