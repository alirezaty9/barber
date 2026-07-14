import './globals.css';
import { Vazirmatn, Lalezar } from 'next/font/google';
import Providers from './providers';
import ServiceWorkerRegister from '@/features/pwa/ServiceWorkerRegister';

// بارگذاری فونت با next/font (به‌جای @import در CSS) → بدون درخواست اضافه به Google،
// خودکار self-host می‌شود، از پرش متن (CLS) جلوگیری می‌کند و متغیر CSS می‌سازد.
const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-vazir',
});

// فونت نمایشیِ مخصوص تیترها (متفاوت از فونت متن) برای حال‌وهوای لوکس‌تر.
const lalezar = Lalezar({
  subsets: ['arabic'],
  weight: '400',
  display: 'swap',
  variable: '--font-display',
});

export const metadata = {
  title: 'banad barber | رزرو آنلاین نوبت آرایشگاه',
  description: 'سامانه رزرو آنلاین نوبت آرایشگاه با تم دارک مینیمال و پنل مدیریت مدرن',
  applicationName: 'بَنَد باربر',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'بَنَد باربر',
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
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${lalezar.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
