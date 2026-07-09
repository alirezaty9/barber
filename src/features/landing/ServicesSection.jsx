'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Clock, Scissors } from 'lucide-react';
import { formatPrice, toPersianDigits } from '@/lib/persian';
import { useBookingStore } from '@/features/booking/store';

// نگاشت دسته‌بندی هر خدمت به عکس مرتبط (فایل‌های لوکال در public/images)
const CATEGORY_IMAGES = {
  hair: '/images/service-hair.jpg',
  beard: '/images/service-beard.jpg',
  grooming: '/images/service-grooming.jpg',
  groom: '/images/service-groom.jpg',
  combo: '/images/service-combo.jpg',
  style: '/images/service-hair.jpg',
};

// عکس کارت خدمت؛ اگر فایل عکس موجود نبود، به‌جای تصویر شکسته یک طرح جایگزین (آیکن قیچی) نشان می‌دهد.
function ServiceCardImage({ category, name }) {
  const [errored, setErrored] = useState(false);
  const src = CATEGORY_IMAGES[category];

  if (!src || errored) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
        <Scissors className="w-10 h-10 text-amber-500/40" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      fill
      sizes="(max-width: 640px) 100vw, 224px"
      onError={() => setErrored(true)}
      className="object-cover transition duration-500 group-hover:brightness-110"
    />
  );
}

export default function ServicesSection({ services }) {
  const openWithService = useBookingStore((s) => s.openWithService);

  return (
    <section id="services" className="py-24 bg-[#050505] relative z-10 border-t border-zinc-900/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-amber-500 font-bold text-xs tracking-wider uppercase bg-amber-500/10 px-3.5 py-1.5 rounded-full">
            لیست منو و خدمات
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-white mt-4 mb-3">خدمات حرفه‌ای و استایل‌های نوین</h2>
          <p className="text-zinc-400 text-sm md:text-base">
            روی هر خدمت کلیک کنید تا رزرو نوبت آغاز شود. می‌توانید یک یا چند خدمت را با هم انتخاب کنید.
          </p>
        </div>

        {services.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm py-12">هنوز خدمتی ثبت نشده است.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 max-w-4xl mx-auto">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => openWithService(service.id)}
                className="glass rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-300 flex flex-col sm:flex-row group text-right hover:-translate-y-0.5"
              >
                <div className="relative w-full sm:w-56 h-44 shrink-0 overflow-hidden bg-zinc-900">
                  <ServiceCardImage category={service.category} name={service.name} />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-lg font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{service.name}</h3>
                    <div className="text-amber-500 font-extrabold text-base whitespace-nowrap bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/10">
                      {formatPrice(service.price)}
                    </div>
                  </div>
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-4 line-clamp-2">{service.description}</p>

                  <div className="flex items-center justify-between border-t border-zinc-900/80 pt-3 mt-auto">
                    <span className="flex items-center gap-2 text-zinc-400 text-xs font-semibold">
                      <Clock className="w-4 h-4 text-amber-500" />
                      مدت تقریبی: {toPersianDigits(service.duration)} دقیقه
                    </span>
                    <span className="px-4 py-2 bg-zinc-900 group-hover:bg-amber-500 text-zinc-300 group-hover:text-black font-bold text-xs rounded-xl border border-zinc-800 group-hover:border-transparent transition-all duration-300 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5" />
                      <span>انتخاب و رزرو</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-12 text-center text-xs text-zinc-500">
          * پرداخت به‌صورت آنلاین و هنگام رزرو انجام می‌شود. در صورت لغو نوبت، ۵۰٪ مبلغ بازگردانده می‌شود.
        </div>
      </div>
    </section>
  );
}
