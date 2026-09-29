// «کادرِ دعوت به نصب در کدام صفحه‌ها دیده نشود؟»
//
// چرا فایلِ جدا؟ از وقتی کادرِ نصب در ریشه‌ی صفحه (app/layout.jsx) رندر می‌شود، روی
// **همه‌ی** مسیرها می‌آید. این منطق باید جدا و آزمون‌پذیر بماند، چون خرابی‌اش هیچ خطایی
// نمی‌دهد: کادر بی‌صدا روی جایی می‌افتد که نباید، یا بی‌صدا از جایی که باید غیب می‌شود.

// • /admin   → پنلِ خودِ آرایشگر است، نه مشتری؛ او اپ را لازم ندارد و کادر روی ابزارِ کارش
//              می‌افتد.
// • /payment → صفحه‌ی برگشت از درگاه؛ در آن لحظه مشتری باید فقط نتیجه‌ی پرداختش را ببیند.
// (همان دو مسیری که public/sw.js هم «حساس» می‌شماردشان و کش نمی‌کند.)
export const INSTALL_HIDDEN_PREFIXES = ['/admin', '/payment'];

/**
 * آیا در این مسیر کادرِ نصب باید پنهان بماند؟
 *
 * ⚠️ مقایسه عمداً «مسیرِ دقیق یا زیرمسیر» است، نه startsWith خالی. با startsWith خالی، یک
 * مسیرِ آینده مثلِ `/payments-faq` یا `/administration` هم اشتباهی مستثنا می‌شد.
 *
 * @param {string | null | undefined} pathname مسیرِ فعلی (خروجیِ usePathname)
 */
export function isInstallPromptHidden(pathname) {
  if (typeof pathname !== 'string') return false;
  return INSTALL_HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
