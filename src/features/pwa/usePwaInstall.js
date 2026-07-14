'use client';

import { useEffect, useState, useCallback } from 'react';

// هوکِ نصبِ PWA — رویدادِ beforeinstallprompt را می‌گیرد و نگه می‌دارد تا هر جای اپ
// بتوان با یک دکمه دیالوگِ نصبِ نیتیوِ مرورگر را باز کرد.
// خروجی: { installed, canInstall, promptInstall } — promptInstall نتیجه را برمی‌گرداند:
//   'accepted' | 'dismissed' | 'unavailable'
export function usePwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // اگر اپ از قبل نصب/standalone باشد، دیگر نصب‌پذیر نیست.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e) => {
      e.preventDefault(); // جلوی بنرِ پیش‌فرضِ مرورگر را می‌گیریم تا خودمان کنترل کنیم
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return 'unavailable';
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null); // رویداد یک‌بارمصرف است
    return outcome; // 'accepted' | 'dismissed'
  }, [deferred]);

  return { installed, canInstall: !!deferred, promptInstall };
}
