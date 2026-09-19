// مانیفستِ PWA — Next.js این فایل را به‌صورت خودکار در مسیر /manifest.webmanifest
// سرو می‌کند و لینکِ <link rel="manifest"> را در <head> تزریق می‌کند.
// داک: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
//
// نامِ اپ از src/lib/shop.js می‌آید (همان منبعی که عنوانِ سایت و فوتر از آن می‌خوانند).
// قبلاً اینجا دستی نوشته شده بود؛ نتیجه‌اش این بود که با عوض‌کردنِ نامِ مجموعه، نامِ
// آیکنِ نصب‌شده روی گوشی کهنه می‌ماند — بدونِ اینکه جایی خطا بدهد.
import { SHOP_NAME } from '@/lib/shop';

export default function manifest() {
  return {
    name: SHOP_NAME,
    short_name: SHOP_NAME,
    description: 'رزرو آنلاین نوبت آرایشگاه بناد و پنل مدیریت',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    dir: 'rtl',
    lang: 'fa-IR',
    background_color: '#030303',
    theme_color: '#0a0a0a',
    categories: ['lifestyle', 'business'],
    // میان‌بُرها: در حالت نصب‌شده (PWA) که نوار آدرس وجود ندارد، با نگه‌داشتن (long-press)
    // روی آیکونِ اپ این میان‌برها ظاهر می‌شوند و دسترسی مستقیم به پنل مدیریت و رهگیری فراهم می‌شود.
    shortcuts: [
      { name: 'پنل مدیریت', short_name: 'مدیریت', url: '/admin', description: 'ورود به پنل مدیریت' },
      { name: 'رهگیری نوبت', short_name: 'رهگیری', url: '/track', description: 'پیگیری وضعیت نوبت' },
    ],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
