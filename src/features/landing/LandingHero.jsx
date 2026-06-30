'use client';

import { Calendar, MapPin, Phone, Star } from 'lucide-react';
import { useBookingStore } from '@/features/booking/store';

export default function LandingHero() {
  const openBooking = useBookingStore((s) => s.openBooking);

  return (
    <header id="hero" className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#030303] text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/60 via-zinc-950 to-black z-0" />
      <div
        className="absolute inset-0 opacity-20 mix-blend-luminosity z-0"
        style={{
          backgroundImage: `url('/images/hero-bg.jpg')`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] md:w-[600px] h-[350px] bg-amber-500/5 blur-[120px] rounded-full z-0 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center my-auto pt-24 pb-16 flex flex-col items-center">
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-tight text-white leading-tight mb-6">
          اصالت سبک، <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600">هنر پیراستن</span>
        </h1>

        <p className="text-zinc-400 text-base md:text-lg max-w-2xl leading-relaxed mb-10">
          در آرایشگاه رویال، هنر دست هنرمندان ارشد با فضایی لوکس و مینیمال پیوند خورده است.
          سبک ایده‌آل خود را رزرو کنید و از کیفیت برتر و بی‌رقیب لذت ببرید.
        </p>

        <div className="flex justify-center items-center w-full max-w-md">
          <button
            onClick={openBooking}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-base rounded-xl shadow-2xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3"
          >
            <Calendar className="w-5 h-5" />
            <span>رزرو نوبت آنلاین</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg w-full text-center border-t border-zinc-900/80 pt-8">
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-amber-500">۱۰۰٪</p>
            <p className="text-xs text-zinc-400 mt-1">رضایت مشتریان</p>
          </div>
          <div className="border-x border-zinc-900/80">
            <p className="text-2xl md:text-3xl font-extrabold text-amber-500">۳</p>
            <p className="text-xs text-zinc-400 mt-1">آرایشگر متخصص</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-extrabold text-amber-500">+۸</p>
            <p className="text-xs text-zinc-400 mt-1">سال تجربه درخشان</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-zinc-950/80 border-t border-zinc-900/60 backdrop-blur-sm py-4 w-full">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-zinc-400">
          <div className="flex items-center justify-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span>مهرشهر، خیابان صد</span>
          </div>
          <div className="flex items-center justify-center gap-2 border-y md:border-y-0 md:border-x border-zinc-900 py-2 md:py-0">
            <Phone className="w-4 h-4 text-amber-500" />
            <span>تلفن تماس: ۰۹۱۹۵۴۹۶۹۲۹</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <span>شنبه تا جمعه - ۹ صبح تا ۱۰ شب</span>
          </div>
        </div>
      </div>
    </header>
  );
}
