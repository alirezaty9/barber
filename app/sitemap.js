import { SITE_URL } from '@/lib/site';

// نقشه‌ی سایت — فهرستِ صفحاتِ عمومی برای موتورهای جست‌وجو. Next این را به‌صورتِ
// خودکار روی آدرسِ /sitemap.xml سرو می‌کند و فایلِ robots هم به همین‌جا اشاره می‌دهد.
// داک: nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
//
// فقط صفحاتِ «عمومی و پایدار» اینجا می‌آیند. صفحاتِ مدیریت و نتیجه‌ی پرداخت عمداً
// نیستند، چون در robots هم بسته شده‌اند.
//
// changeFrequency و priority «راهنمایی» هستند نه دستور؛ گوگل می‌تواند نادیده بگیردشان.
// تاریخِ lastModified همان لحظه‌ی بیلد است — یعنی هر بار که سایت را دیپلوی کنی تازه می‌شود.

export default function sitemap() {
  const lastModified = new Date();

  return [
    {
      // صفحه‌ی اصلی: کاتالوگِ خدمات و قیمت‌ها — مهم‌ترین صفحه برای دیده‌شدن در جست‌وجو.
      url: SITE_URL,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      // رهگیری نوبت: صفحه‌ای که مشتری با شماره‌ی موبایل نوبت‌هایش را می‌بیند.
      url: `${SITE_URL}/track`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      // قوانین و مقررات: کم تغییر می‌کند، ولی وجودش برای اعتمادِ کاربر و بررسیِ
      // درگاهِ پرداخت لازم است، پس باید قابلِ پیداشدن باشد.
      url: `${SITE_URL}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
