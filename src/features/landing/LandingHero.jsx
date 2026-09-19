'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Phone, Instagram, Search, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useBookingStore } from '@/features/booking/store';
import { usePwaInstall } from '@/features/pwa/usePwaInstall';
import { showManualInstallHelp } from '@/features/pwa/install-guidance';
// با import (به‌جای مسیرِ دستی)، نامِ فایلِ خروجی اثرِ انگشتِ محتوا را می‌گیرد؛ پس تعویضِ
// عکس خودکار باعثِ تازه‌شدنِ آن در مرورگرِ مشتری‌های قدیمی می‌شود.
import heroBg from '@/images/hero-bg.jpg';

export default function LandingHero() {
  const openBooking = useBookingStore((s) => s.openBooking);
  const { promptInstall } = usePwaInstall();

  // آیکون‌های میان‌بر همگی طلایی (هم‌رنگ متن برند).
  const iconLink = 'p-3.5 bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/50 text-amber-500 hover:text-amber-400 rounded-2xl transition-all duration-300 hover:-translate-y-1';

  // کلیک روی آیکونِ نصب: پنجره‌ی نصبِ خودِ مرورگر را باز می‌کند؛ اگر مرورگر پشتیبانی نکند
  // (مثل سافاریِ آیفون)، راهنمای دستیِ مشترک نشان داده می‌شود.
  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      toast.success('اپ روی صفحه‌ی اصلیِ دستگاه شما اضافه شد ✅');
    } else if (outcome === 'unavailable') {
      showManualInstallHelp();
    }
  };

  return (
    <header id="hero" className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#030303] text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/60 via-zinc-950 to-black z-0" />
      {/* پس‌زمینه‌ی هیرو با next/image تا خودکار WebP/AVIF و ری‌سایز شود
          (به‌جای فایل خام ۵۳۲KB). priority چون بالای صفحه و LCP است. */}
      <Image
        src={heroBg}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-20 mix-blend-luminosity z-0"
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] md:w-[600px] h-[350px] bg-amber-500/5 blur-[120px] rounded-full z-0 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center my-auto -translate-y-6 md:-translate-y-10 pt-24 pb-16 flex flex-col items-center">
        <h1 dir="ltr" className="font-display text-5xl sm:text-6xl md:text-8xl lg:text-9xl tracking-tight leading-none mb-6 whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600">
          |&nbsp;banad&nbsp;&nbsp;&nbsp;barber&nbsp;|
        </h1>

        <p dir="ltr" className="text-zinc-300 text-lg md:text-2xl tracking-[0.3em] uppercase font-light mb-10">
          haircut &amp; style
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full max-w-md">
          <button
            onClick={openBooking}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-base rounded-xl shadow-2xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3"
          >
            <Calendar className="w-5 h-5" />
            <span>رزرو نوبت آنلاین</span>
          </button>
          <Link
            href="/track"
            className="w-full sm:w-auto px-8 py-4 border border-amber-500/40 hover:border-amber-500 text-amber-500 hover:text-amber-400 font-bold text-base rounded-xl transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3 bg-zinc-900/40"
          >
            <Search className="w-5 h-5" />
            <span>رهگیری نوبت</span>
          </Link>
        </div>

        {/* ردیف آیکون‌های میان‌بر — هرکدام به سکشن مربوطه در فوتر اسکرول می‌کند */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <a href="tel:+989195496929" aria-label="تماس تلفنی" className={iconLink}>
            <Phone className="w-5 h-5" />
          </a>
          <a href="#location" aria-label="موقعیت مکانی" className={iconLink}>
            <MapPin className="w-5 h-5" />
          </a>
          <a href="#social" aria-label="اینستاگرام" className={iconLink}>
            <Instagram className="w-5 h-5" />
          </a>
          {/* دکمه‌ی نصب اپ (PWA) — با تولتیپِ «pwa» روی هاور */}
          <div className="relative group">
            <button type="button" onClick={handleInstall} aria-label="نصب PWA" className={iconLink}>
              <Smartphone className="w-5 h-5" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1 text-[11px] font-bold text-amber-400 border border-amber-500/20 shadow-lg opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0"
            >
              pwa
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
