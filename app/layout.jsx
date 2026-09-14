import './globals.css';
import Providers from './providers';
import ServiceWorkerRegister from '@/features/pwa/ServiceWorkerRegister';
import { SITE_URL } from '@/lib/site';

// فونت‌ها به‌صورت self-host از داخلِ پروژه لود می‌شوند (فایل‌های public/fonts + @font-face
// در globals.css) — مستقل از گوگل‌فونت، پس لوکال و سرور کاملاً یکسان‌اند.

export const metadata = {
  // آدرسِ پایه برای تبدیلِ مسیرهای نسبی به آدرسِ کامل در تگ‌های متادیتا.
  metadataBase: new URL(SITE_URL),
  // «آدرسِ متعارف» (canonical): به گوگل می‌گوید نسخه‌ی رسمیِ این صفحه کدام آدرس است.
  // بدونِ این، اگر سایت هم‌زمان از چند آدرس در دسترس باشد (دامنه‌ی اصلی + آدرسِ پیش‌فرضِ
  // هاست)، گوگل آن‌ها را «محتوای تکراری» می‌بیند و اعتبارِ صفحه بینشان تقسیم می‌شود.
  alternates: { canonical: '/' },
  title: 'banad barber | رزرو آنلاین نوبت آرایشگاه',
  description: 'سامانه رزرو آنلاین نوبت آرایشگاه با تم دارک مینیمال و پنل مدیریت مدرن',
  applicationName: 'banad barber',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'banad barber',
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
