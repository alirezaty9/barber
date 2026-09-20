// توابع کمکیِ فارسی — بدون وابستگی به React تا هم در سرور و هم در کلاینت قابل استفاده باشند.

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * تبدیل ارقام انگلیسی داخل یک عدد/رشته به ارقام فارسی.
 * مثال: toPersianDigits('10:00') → '۱۰:۰۰'
 */
export function toPersianDigits(num) {
  return num.toString().replace(/[0-9]/g, (d) => PERSIAN_DIGITS[+d]);
}

/**
 * تبدیل ارقام فارسی/عربی به ارقام انگلیسی استاندارد.
 * برای اعتبارسنجی ورودی‌هایی مثل شماره‌ی موبایل لازم است؛ کاربر ممکن است با
 * کیبورد فارسی «۰۹۱۲...» تایپ کند و regex انگلیسی آن را رد می‌کرد.
 * مثال: normalizeDigits('۰۹۱۲') → '0912'
 */
export function normalizeDigits(input) {
  if (input == null) return '';
  return input
    .toString()
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

/**
 * قالب‌بندی قیمت به تومان با جداکننده‌ی هزارگان فارسی.
 * مثال: formatPrice(320000) → '۳۲۰٬۰۰۰ تومان'
 */
export function formatPrice(price) {
  const formatted = Number(price).toLocaleString('fa-IR');
  return `${formatted} تومان`;
}

/**
 * برچسب تاریخ شمسی خوانا از یک رشته‌ی ISO (YYYY-MM-DD).
 * مثال: formatJalaliDate('2026-06-29') → '۸ تیر' (با locale fa-IR که تقویم جلالی است)
 */
export function formatJalaliDate(isoDate, options = { day: 'numeric', month: 'long' }) {
  try {
    // تاریخ را «ظهرِ UTC» تفسیر و در همان UTC فرمت می‌کنیم تا نگاشتِ میلادی→جلالی مستقل از
    // تایم‌زونِ اجرا باشد. بدونِ این، new Date('YYYY-MM-DD') نیمه‌شبِ UTC است و در تایم‌زون‌های
    // عقب‌تر یک روز عقب نمایش داده می‌شد (خطای off-by-one در برچسبِ روز).
    return new Intl.DateTimeFormat('fa-IR', { timeZone: 'UTC', ...options }).format(
      new Date(`${isoDate}T12:00:00Z`),
    );
  } catch {
    return isoDate;
  }
}

/** نامِ ماه‌های شمسی به ترتیب (اندیسِ ۰ = فروردین). */
export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

// فرمترِ سال/ماهِ شمسی یک‌بار ساخته می‌شود (ساختِ Intl.DateTimeFormat گران است) و بینِ
// همه‌ی رکوردها بازاستفاده می‌شود؛ به‌علاوه نتیجه‌ی هر تاریخ کش می‌شود تا برای رکوردهای
// هم‌تاریخ دوباره محاسبه نشود.
//
// ⚠️ timeZone صریحاً UTC است و تاریخ «ظهرِ UTC» تفسیر می‌شود — همان قراردادِ
// formatJalaliDate. بدونِ آن، نگاشتِ میلادی→شمسی به تایم‌زونِ سرور وابسته می‌شد.
const PERSIAN_YM_FMT = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  timeZone: 'UTC', year: 'numeric', month: 'numeric',
});
const ymCache = new Map();

/**
 * سال و ماهِ شمسیِ یک تاریخِ ISO میلادی، با ارقامِ لاتین (برای محاسبه، نه نمایش).
 * مثال: jalaliYM('2026-09-23') → { y: '1405', m: 7 }
 */
export function jalaliYM(isoDate) {
  const hit = ymCache.get(isoDate);
  if (hit) return hit;
  const parts = PERSIAN_YM_FMT.formatToParts(new Date(`${isoDate}T12:00:00Z`));
  const val = {
    y: parts.find((x) => x.type === 'year')?.value,
    m: parseInt(parts.find((x) => x.type === 'month')?.value, 10),
  };
  ymCache.set(isoDate, val);
  return val;
}

/**
 * اعتبارسنجی شماره‌ی موبایل: ۱۱ رقمی که با ۰۹ شروع شود (بعد از نرمال‌سازیِ ارقام).
 */
export function isValidIranMobile(value) {
  return /^09[0-9]{9}$/.test(normalizeDigits(value).trim());
}
