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
    return new Intl.DateTimeFormat('fa-IR', options).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

/**
 * اعتبارسنجی شماره‌ی موبایل.
 * ⚠️ موقتاً برای تست ساده شده: هر عددِ حداقل ۱ رقمی مجاز است.
 * برای production این را به /^09[0-9]{9}$/ برگردان.
 */
export function isValidIranMobile(value) {
  return /^[0-9]{1,}$/.test(normalizeDigits(value).trim());
}
