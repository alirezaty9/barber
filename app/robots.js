import { SITE_URL } from '@/lib/site';
import { INDEXING_ENABLED } from '@/lib/features';

// راهنمای خزنده‌های موتورِ جست‌وجو (گوگل و…). Next این را به‌صورتِ خودکار روی
// آدرسِ /robots.txt سرو می‌کند. داک: nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
//
// دو کار می‌کند:
//   ۱) صفحاتِ عمومی (صفحه‌ی اصلی، قوانین، رهگیری) آزاد برای فهرست‌شدن.
//   ۲) مسیرهایی که نباید در نتایجِ گوگل ظاهر شوند بسته می‌شوند:
//      • /admin  → پنلِ مدیریت؛ نه محتوایی برای گوگل دارد و نه درست است آدرسش تبلیغ شود.
//      • /api/   → پاسخ‌های داده‌ای، نه صفحه.
//      • /payment/ → صفحه‌ی نتیجه‌ی پرداخت؛ فقط با پارامترِ یک تراکنشِ مشخص معنا دارد.
//      • /offline → صفحه‌ی «اینترنت نداری» مخصوصِ حالتِ نصب‌شده (PWA).
//
// ⚠️ این فایل یک «درخواستِ مؤدبانه» است، نه قفلِ امنیتی. خزنده‌های سالم رعایتش می‌کنند
//    ولی مهاجم نه. محافظتِ واقعیِ /admin همان احرازِ هویتِ middleware است که سرِ جایش هست.

export default function robots() {
  // ⏸️ تا وقتی کلیدِ فهرست‌شدن خاموش است (دوره‌ی درگاهِ تستی)، کلِ سایت بسته می‌شود و
  // نقشه‌ی سایت هم اعلام نمی‌شود — تا اصلاً دعوتی برای خزیدن وجود نداشته باشد.
  // (رجوع به INDEXING_ENABLED در src/lib/features.js برای روشن‌کردنِ دوباره)
  if (!INDEXING_ENABLED) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/payment/', '/offline'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
