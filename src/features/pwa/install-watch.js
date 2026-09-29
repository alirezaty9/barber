import { INSTALL_READY_EVENT } from './install-keys';

// «زیرِ نظر گرفتنِ اجازه‌ی نصب».
//
// 🔴 مسئله‌ای که این فایل حل می‌کند:
// اجازه‌ی نصب در حافظه‌ی مرورگر نگه داشته می‌شود و وضعیتِ داخلیِ اپ فقط یک **رونوشت** از
// آن است. تا پیش از این، رونوشت فقط با شنیدنِ یک خبرِ **یک‌بارمصرف** تازه می‌شد. هر دلیلی
// که باعث شود آن خبر به گوشِ ما نرسد — دیر آماده‌شدنِ کدِ صفحه، یا خبری که درست در فاصله‌ی
// بینِ «خواندنِ اولیه» و «ثبتِ شنونده» برسد — رونوشت را برای همیشه کهنه نگه می‌داشت:
// مرورگر اجازه را داده بود ولی دکمه‌ی ما همچنان می‌گفت «آماده نیست»، و فقط با رفتن به
// صفحه‌ی دیگر و برگشتن درست می‌شد (چون آن موقع دوباره از اول خوانده می‌شد).
//
// راهِ حل: به‌جای تکیه‌ی انحصاری بر یک خبرِ یک‌بارمصرف، منبعِ اصلی را مرتب هم خودمان بخوانیم.
//
// 🌍 آنالوژی: به‌جای اینکه فقط منتظرِ زنگِ در بمانی (که ممکن است نشنوی)، هر چند لحظه هم
// خودت پشتِ در را نگاه کنی.
//
// چرا فایلِ جدا؟ تا بشود بدونِ مرورگر و بدونِ React آزمونش کرد — خرابیِ این منطق هیچ خطایی
// نمی‌دهد و فقط به‌شکلِ «دکمه‌ی نصب هیچ‌وقت فعال نمی‌شود» بروز می‌کند.

// ⏱️ فقط یک دقیقه‌ی اولِ صفحه نگاه می‌کنیم: مرورگر تصمیمش را در همین چند ثانیه می‌گیرد،
// پس نگاه‌کردنِ ابدی فقط کارِ بی‌خود است.
export const INSTALL_WATCH_MS = 60_000;
export const INSTALL_WATCH_INTERVAL_MS = 1_000;

/**
 * `sync` را هر وقت که ممکن است اجازه‌ی نصب عوض شده باشد صدا می‌زند:
 *   • وقتی خبرِ رسیدنِ اجازه اعلام شود،
 *   • هر ثانیه تا یک دقیقه،
 *   • و وقتی کاربر به این تب برمی‌گردد.
 *
 * @param {() => void} sync کاری که باید انجام شود (خواندنِ حافظه‌ی مرورگر)
 * @param {object} [deps] فقط برای آزمون؛ در مرورگر خالی می‌ماند
 * @returns {() => void} تابعِ پاک‌سازی — همه‌ی شنونده‌ها و زمان‌سنج را برمی‌دارد
 */
export function watchInstallPermission(sync, deps = {}) {
  const {
    win = typeof window === 'undefined' ? null : window,
    doc = typeof document === 'undefined' ? null : document,
    durationMs = INSTALL_WATCH_MS,
    intervalMs = INSTALL_WATCH_INTERVAL_MS,
    now = () => Date.now(),
  } = deps;

  // روی سرور (جایی که مرورگری وجود ندارد) هیچ کاری نمی‌کند و یک پاک‌سازیِ خالی برمی‌گرداند.
  if (!win || !doc) return () => {};

  win.addEventListener(INSTALL_READY_EVENT, sync);
  // ⚠️ این خبر روی document اعلام می‌شود، نه روی window.
  doc.addEventListener('visibilitychange', sync);
  // برگشت با دکمه‌ی «بازگشت»ِ مرورگر هم صفحه را از حافظه بیرون می‌آورد بدونِ بارگذاریِ دوباره.
  win.addEventListener('pageshow', sync);

  const startedAt = now();
  const timer = setInterval(() => {
    sync();
    if (now() - startedAt >= durationMs) clearInterval(timer);
  }, intervalMs);

  return () => {
    win.removeEventListener(INSTALL_READY_EVENT, sync);
    doc.removeEventListener('visibilitychange', sync);
    win.removeEventListener('pageshow', sync);
    clearInterval(timer);
  };
}
