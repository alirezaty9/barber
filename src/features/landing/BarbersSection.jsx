'use client';

import Image from 'next/image';
import { Star, Scissors } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';
import { useBookingStore } from '@/features/booking/store';

export default function BarbersSection({ barbers }) {
  const openWithBarber = useBookingStore((s) => s.openWithBarber);

  return (
    <section id="barbers" className="py-24 bg-[#030303] relative z-10 border-t border-zinc-900/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-amber-500 font-bold text-xs tracking-wider uppercase bg-amber-500/10 px-3.5 py-1.5 rounded-full">
            تیم پیراستاران متخصص
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-4 mb-3">استایلیست‌های ارشد ما را بشناسید</h2>
          <p className="text-zinc-400 text-sm md:text-base">
            هر یک از اعضای تیم ما با تکیه بر سال‌ها تخصص و مهارت، آماده خلق سبکی بی‌نظیر برای شما هستند. شما می‌توانید آرایشگر دلخواه خود را شخصاً انتخاب کنید.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              className="bg-zinc-950/60 border border-zinc-900 rounded-3xl overflow-hidden hover:border-amber-500/20 transition-all duration-500 group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-64 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent z-10" />
                  {barber.image ? (
                    <Image
                      src={barber.image}
                      alt={barber.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 filter grayscale group-hover:grayscale-0"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-900" />
                  )}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-1 px-3 py-1 bg-zinc-900/90 backdrop-blur-md rounded-full border border-zinc-800">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-bold text-zinc-100">{toPersianDigits(barber.rating)}</span>
                  </div>
                </div>

                <div className="p-6 relative z-20 -mt-10">
                  <div className="flex items-center gap-4 mb-4">
                    {barber.avatar ? (
                      <Image
                        src={barber.avatar}
                        alt={barber.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/30 shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-amber-500/30" />
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-amber-500 transition-colors">{barber.name}</h3>
                      <p className="text-xs text-amber-500 font-semibold">{barber.specialty}</p>
                    </div>
                  </div>
                  <p className="text-zinc-400 text-xs md:text-sm leading-relaxed min-h-[80px]">{barber.bio}</p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => openWithBarber(barber.id)}
                  className="w-full py-3 bg-zinc-900 hover:bg-gradient-to-l hover:from-amber-500 hover:to-amber-600 text-zinc-300 hover:text-black font-bold text-sm rounded-2xl border border-zinc-800 hover:border-transparent transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Scissors className="w-4 h-4" />
                  <span>انتخاب نوبت با {barber.name}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
