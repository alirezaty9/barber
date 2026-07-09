'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Phone, Instagram, Search, Smartphone } from 'lucide-react';
import { useBookingStore } from '@/features/booking/store';

export default function LandingHero() {
  const openBooking = useBookingStore((s) => s.openBooking);

  // آیکون‌های میان‌بر همگی طلایی (هم‌رنگ متن برند). PWA فعلاً بدون عملکرد است.
  const iconLink = 'p-3.5 bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/50 text-amber-500 hover:text-amber-400 rounded-2xl transition-all duration-300 hover:-translate-y-1';

  return (
    <header id="hero" className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#030303] text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/60 via-zinc-950 to-black z-0" />
      {/* پس‌زمینه‌ی هیرو با next/image تا روی Vercel خودکار WebP/AVIF و ری‌سایز شود
          (به‌جای فایل خام ۵۳۲KB). priority چون بالای صفحه و LCP است. */}
      <Image
        src="/images/hero-bg.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-20 mix-blend-luminosity z-0"
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] md:w-[600px] h-[350px] bg-amber-500/5 blur-[120px] rounded-full z-0 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center my-auto pt-24 pb-16 flex flex-col items-center">
        <h1 dir="ltr" className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tight leading-none mb-6 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600">
          | banad barber |
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
          {/* دکمه‌ی نصب اپ (PWA) — فعلاً بدون عملکرد */}
          <button type="button" aria-label="نصب اپلیکیشن" className={iconLink}>
            <Smartphone className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
