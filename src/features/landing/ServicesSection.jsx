'use client';

import { useState } from 'react';
import { Clock, Scissors } from 'lucide-react';
import { formatPrice, toPersianDigits } from '@/lib/persian';
import { cn } from '@/lib/utils';
import { useBookingStore } from '@/features/booking/store';

const CATEGORIES = [
  { id: 'all', label: 'همه خدمات' },
  { id: 'hair', label: 'اصلاح مو' },
  { id: 'beard', label: 'اصلاح ریش' },
  { id: 'grooming', label: 'پاکسازی و گریم' },
  { id: 'groom', label: 'گریم داماد' },
  { id: 'combo', label: 'پکیج‌های ویژه' },
];

// نگاشت دسته‌بندی هر خدمت به عکس مرتبط (فایل‌های لوکال در public/images)
const CATEGORY_IMAGES = {
  hair: '/images/service-hair.jpg',
  beard: '/images/service-beard.jpg',
  grooming: '/images/service-grooming.jpg',
  groom: '/images/service-groom.jpg',
  combo: '/images/service-combo.jpg',
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
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setErrored(true)}
      className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:brightness-110"
    />
  );
}

export default function ServicesSection({ services }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const openWithService = useBookingStore((s) => s.openWithService);

  const filtered = services.filter((s) => activeCategory === 'all' || s.category === activeCategory);

  return (
    <section id="services" className="py-24 bg-[#050505] relative z-10 border-t border-zinc-900/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-amber-500 font-bold text-xs tracking-wider uppercase bg-amber-500/10 px-3.5 py-1.5 rounded-full">
            لیست منو و خدمات
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-white mt-4 mb-3">خدمات حرفه‌ای و استایل‌های نوین</h2>
          <p className="text-zinc-400 text-sm md:text-base">
            ما از بهترین محصولات آرایشی و مراقبتی دنیا در کنار مدرن‌ترین ابزارها استفاده می‌کنیم تا بالاترین سطح رضایت را برای شما رقم بزنیم.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-300',
                activeCategory === category.id
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm py-12">خدمتی در این دسته‌بندی موجود نیست.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((service) => (
              <div
                key={service.id}
                className="glass rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all duration-300 flex flex-col group hover:-translate-y-1"
              >
                {/* عکس مرتبط با عنوان/دسته‌بندی خدمت — نسبت ۳:۲ برابر با خود عکس‌ها تا هیچ بخشی بریده نشود */}
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-zinc-900">
                  <ServiceCardImage category={service.category} name={service.name} />
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="text-lg font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{service.name}</h3>
                      <div className="text-amber-500 font-extrabold text-base whitespace-nowrap bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/10">
                        {formatPrice(service.price)}
                      </div>
                    </div>
                    <p className="text-zinc-400 text-xs md:text-sm leading-relaxed mb-6">{service.description}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-auto">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>مدت زمان تقریبی: {toPersianDigits(service.duration)} دقیقه</span>
                  </div>
                  <button
                    onClick={() => openWithService(service.id)}
                    className="px-4 py-2 bg-zinc-900 group-hover:bg-amber-500 text-zinc-300 group-hover:text-black font-bold text-xs rounded-xl border border-zinc-800 group-hover:border-transparent transition-all duration-300 flex items-center gap-1.5"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>انتخاب و رزرو</span>
                  </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center text-xs text-zinc-500">
          * تمامی هزینه‌ها نهایی بوده و نیازی به پرداخت اینترنتی در هنگام رزرو نیست. پرداخت در آرایشگاه انجام می‌شود.
        </div>
      </div>
    </section>
  );
}
