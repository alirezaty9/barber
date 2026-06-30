import './globals.css';
import { Vazirmatn, Lalezar } from 'next/font/google';
import Providers from './providers';

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
  title: 'پیرایش رویال | رزرو آنلاین نوبت آرایشگاه',
  description: 'سامانه رزرو آنلاین نوبت آرایشگاه با تم دارک مینیمال و پنل مدیریت مدرن',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${lalezar.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
