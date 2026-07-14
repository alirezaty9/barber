'use client';

import { useEffect } from 'react';

// ثبتِ سرویس‌ورکر پس از بارگذاری کامل صفحه (تا با رندر اولیه رقابت نکند).
// در محیط توسعه ثبت نمی‌شود تا با HMR تداخل نکند؛ فقط در production فعال است.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        // خطای ثبت نباید اپ را بشکند؛ فقط لاگ می‌کنیم.
        console.error('SW registration failed:', err);
      });
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
