'use client';

import { toast } from 'sonner';

// راهنمای نصبِ دستی — برای وقتی که مرورگر اجازه‌ی نصبِ یک‌کلیکی نمی‌دهد.

// آیفون و آی‌پد: سافاری نصبِ یک‌کلیکی را **اصلاً** پشتیبانی نمی‌کند (محدودیتِ اپل است،
// نه ایرادِ سایت). تنها راه، مسیرِ دستیِ «اشتراک‌گذاری ← Add to Home Screen» است.
//
// ⚠️ آی‌پدهای جدید خودشان را «Macintosh» معرفی می‌کنند، برای همین لمسی‌بودن هم چک می‌شود.
export function isAppleMobile() {
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return /Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1;
}

// وقتی نصبِ یک‌کلیکی ممکن نیست، به‌جای سکوت بگو دقیقاً چه باید بکند.
export function showManualInstallHelp() {
  if (isAppleMobile()) {
    toast(
      'روی آیفون، نصب باید دستی انجام شود: دکمه‌ی اشتراک‌گذاری (مربع با فلشِ رو به بالا) را بزن و «Add to Home Screen» را انتخاب کن.',
      { duration: 8000 }
    );
    return;
  }

  toast(
    'اگر اپ را قبلاً نصب کرده‌ای، همان آیکن را روی دستگاهت باز کن. در غیر این صورت از منوی مرورگر گزینه‌ی «نصب برنامه / Install app» را بزن.',
    { duration: 8000 }
  );
}
