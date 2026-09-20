// محدودکننده‌ی نرخِ ساده و درون‌حافظه‌ای (fixed-window).
//
// ℹ️ روی هاستی که اپ را در «یک سرورِ همیشه‌روشن» اجرا می‌کند (مثلِ لیارا با یک نمونه)،
// این شمارنده واقعاً سراسری است و درست کار می‌کند.
//
// ⚠️ ولی دو حالت آن را می‌شکند: (۱) اگر تعدادِ نمونه‌های اپ را بیشتر از یک کنی (scale)،
// هر نمونه حافظه‌ی خودش را دارد و سقف عملاً چند برابر می‌شود؛ (۲) بعد از هر دیپلوی یا
// ری‌استارت، شمارنده صفر می‌شود. برای محافظتِ قویِ چنددستگاهی باید به یک استورِ مشترک
// (مثلِ Redis) مهاجرت کرد؛ امضای rateLimit تغییری نمی‌کند.

const buckets = new Map();

// هرس‌کردنِ سطل‌های منقضی. بدونِ این، کلیدِ هر IP/شماره‌ای که یک‌بار دیده شده تا ابد در حافظه
// می‌ماند و کسی که با هدرهای ساختگی کلیدهای تازه می‌سازد می‌تواند حافظه را آرام‌آرام پر کند.
// هر ۵ دقیقه یک‌بار و فقط روی سطل‌هایی که پنجره‌شان تمام شده اجرا می‌شود (هزینه‌ی ناچیز).
const SWEEP_EVERY_MS = 5 * 60 * 1000;
let lastSweep = 0;
function sweep(now) {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [k, v] of buckets) {
    if (now > v.reset) buckets.delete(k);
  }
}

export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  sweep(now);
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

// استخراجِ IP کلاینت. هدرِ `x-real-ip` را پروکسیِ خودِ هاست ست می‌کند و قابلِ اعتمادتر از
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
