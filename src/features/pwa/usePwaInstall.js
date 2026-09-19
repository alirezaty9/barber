'use client';

import { useEffect, useCallback } from 'react';
import { usePwaInstallStore } from './install-store';
import { INSTALL_EVENT_KEY, INSTALL_READY_EVENT } from './install-keys';

// هوکِ نصبِ PWA.
//
// 🔴 مسئله‌ای که این فایل حل می‌کند — «اجازه‌ی نصب زودتر از React می‌رسد»:
// مرورگر وقتی مطمئن شد سایت قابلِ نصب است، **یک‌بار** اعلام می‌کند و اگر کسی همان لحظه
// گوش نداده باشد، دیگر **هرگز تکرارش نمی‌کند**. قبلاً گوش‌دادن داخلِ useEffect بود، یعنی
// بعد از اینکه React کلِ صفحه را بالا می‌آورد. روی صفحه‌ی اصلی — که عکسِ بزرگ و فونت و
// داده‌ی دیتابیس دارد — این چند لحظه دیر است و اعلام پیش از آن رد می‌شد. نتیجه‌اش دقیقاً
// همان چیزی بود که دیده می‌شد: دکمه‌ی نصب به‌جای بازکردنِ پنجره‌ی نصب، پیامِ راهنما می‌داد.
//
// راهِ حل: یک اسکریپتِ کوچک در همان ابتدای صفحه (InstallCapture.jsx) اعلام را می‌گیرد و
// نگه می‌دارد. این هوک فقط آن را از جایی که نگه داشته شده برمی‌دارد — پس دیگر مهم نیست
// React چقدر دیر بالا بیاید.
//
// خروجی: { installed, canInstall, promptInstall }
// promptInstall نتیجه را برمی‌گرداند: 'accepted' | 'dismissed' | 'unavailable'
export function usePwaInstall() {
  const canInstall = usePwaInstallStore((s) => s.canInstall);
  const installed = usePwaInstallStore((s) => s.installed);

  useEffect(() => {
    const { setCanInstall, markInstalled } = usePwaInstallStore.getState();

    // اگر اپ همین حالا به‌شکلِ نصب‌شده باز شده، دکمه‌ی نصب دیگر معنا ندارد.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) {
      markInstalled();
      return;
    }

    // ممکن است اجازه‌ی نصب پیش از این لحظه رسیده و کنار گذاشته شده باشد.
    setCanInstall(!!window[INSTALL_EVENT_KEY]);

    const onAvailable = () =>
      usePwaInstallStore.getState().setCanInstall(!!window[INSTALL_EVENT_KEY]);
    const onInstalled = () => usePwaInstallStore.getState().markInstalled();

    window.addEventListener(INSTALL_READY_EVENT, onAvailable);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener(INSTALL_READY_EVENT, onAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const event = window[INSTALL_EVENT_KEY];
    if (!event) return 'unavailable';

    // ⚠️ این اجازه یک‌بارمصرف است و باز کردنش برای بارِ دوم خطا می‌دهد. پس *پیش از*
    // استفاده از دسترسِ همه خارجش می‌کنیم تا دو دکمه نتوانند دو بار مصرفش کنند.
    window[INSTALL_EVENT_KEY] = null;
    usePwaInstallStore.getState().setCanInstall(false);

    try {
      event.prompt();
      const { outcome } = await event.userChoice;
      return outcome; // 'accepted' | 'dismissed'
    } catch {
      // مرورگر به هر دلیلی پنجره را باز نکرد — نباید اپ بشکند.
      return 'unavailable';
    }
  }, []);

  return { installed, canInstall, promptInstall };
}
