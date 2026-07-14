// مانیفستِ PWA — Next.js این فایل را به‌صورت خودکار در مسیر /manifest.webmanifest
// سرو می‌کند و لینکِ <link rel="manifest"> را در <head> تزریق می‌کند.
// داک: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
export default function manifest() {
  return {
    name: 'بَنَد باربر | رزرو آنلاین نوبت آرایشگاه',
    short_name: 'بَنَد باربر',
    description: 'رزرو آنلاین نوبت آرایشگاه و پنل مدیریت',
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
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
