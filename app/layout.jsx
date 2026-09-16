import './globals.css';
import Providers from './providers';
import ServiceWorkerRegister from '@/features/pwa/ServiceWorkerRegister';
import { SITE_URL } from '@/lib/site';
import { SHOP_NAME } from '@/lib/shop';
import { INDEXING_ENABLED } from '@/lib/features';
// عکسِ کارتِ پیش‌نمایشِ شبکه‌های اجتماعی. با import، هم نامِ فایل اثرِ انگشت می‌گیرد (پس
// تعویضِ عکس، پیش‌نمایشِ کهنه را هم تازه می‌کند) و هم ابعادِ واقعی از خودِ فایل خوانده
// می‌شود به‌جای اینکه دستی نوشته و روزی با فایل ناهماهنگ شود.
import heroBg from '@/images/hero-bg.jpg';

// فونت‌ها به‌صورت self-host از داخلِ پروژه لود می‌شوند (فایل‌های public/fonts + @font-face
// در globals.css) — مستقل از گوگل‌فونت، پس لوکال و سرور کاملاً یکسان‌اند.

const TITLE = `${SHOP_NAME} | رزرو آنلاین نوبت آرایشگاه`;

// این متن هم زیرِ نتیجه‌ی گوگل دیده می‌شود و هم در کارتِ پیش‌نمایشِ واتساپ/تلگرام/اینستاگرام.
// پس عمداً با زبانِ مشتری نوشته شده (چه کاری می‌توانی بکنی)، نه با زبانِ فنی.
const DESCRIPTION =
  'نوبت آرایشگاه را آنلاین رزرو کنید: خدمت، روز و ساعت را انتخاب کنید، آنلاین پرداخت کنید و کد رهگیری بگیرید — بدون تماس تلفنی و بدون انتظار.';

export const metadata = {
  // آدرسِ پایه برای تبدیلِ مسیرهای نسبی به آدرسِ کامل در تگ‌های متادیتا.
  metadataBase: new URL(SITE_URL),
  // «آدرسِ متعارف» (canonical): به گوگل می‌گوید نسخه‌ی رسمیِ این صفحه کدام آدرس است.
  // بدونِ این، اگر سایت هم‌زمان از چند آدرس در دسترس باشد (دامنه‌ی اصلی + آدرسِ پیش‌فرضِ
  // هاست)، گوگل آن‌ها را «محتوای تکراری» می‌بیند و اعتبارِ صفحه بینشان تقسیم می‌شود.
  alternates: { canonical: '/' },
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['آرایشگاه مردانه', 'رزرو نوبت آرایشگاه', 'نوبت آنلاین', 'مهرشهر', 'اصلاح مو', 'ریش'],
  applicationName: SHOP_NAME,

  // ⏸️ لایه‌ی دومِ بستنِ فهرست‌شدن. فایلِ robots.txt به خزنده می‌گوید «وارد نشو»، ولی اگر
  // کسی لینکِ مستقیم را جایی منتشر کند بعضی خزنده‌ها باز هم صفحه را برمی‌دارند. این برچسب
  // داخلِ خودِ صفحه است و می‌گوید «حتی اگر مرا خواندی، در نتایج نشانم نده».
  // (رجوع به INDEXING_ENABLED در src/lib/features.js)
  robots: INDEXING_ENABLED
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },

  // ── کارتِ پیش‌نمایشِ لینک در شبکه‌های اجتماعی و پیام‌رسان‌ها ──
  // بدونِ این‌ها، فرستادنِ لینکِ سایت در واتساپ/تلگرام/اینستاگرام فقط یک آدرسِ خشک نشان
  // می‌دهد. با این‌ها، یک کارت با نام، توضیح و عکس ظاهر می‌شود.
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: SHOP_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
    images: [
      {
        // ابعاد صریح نوشته شده تا پیام‌رسان‌ها مجبور نباشند خودِ فایل را دانلود و اندازه‌گیری
        // کنند؛ این‌طور کارتِ پیش‌نمایش سریع‌تر و مطمئن‌تر ساخته می‌شود. مقادیر مستقیم از
        // خودِ فایل می‌آیند، پس هرگز با عکسِ واقعی ناهماهنگ نمی‌شوند.
        url: heroBg.src,
        width: heroBg.width,
        height: heroBg.height,
        alt: `نمای داخلی ${SHOP_NAME}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [heroBg.src],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SHOP_NAME,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

// theme-color و viewport طبق داک Next 15 در export جدا از metadata می‌آیند.
export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
