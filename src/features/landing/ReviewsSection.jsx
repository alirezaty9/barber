'use client';

import { Star, MessageSquare } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';

export default function ReviewsSection({ reviews }) {
  return (
    <section id="reviews" className="py-24 bg-[#050505] relative z-10 border-t border-zinc-900/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-amber-500 font-bold text-xs tracking-wider uppercase bg-amber-500/10 px-3.5 py-1.5 rounded-full">
            تجربه مشتریان رویال
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-4 mb-3">سخنان مشتریان وفادار ما</h2>
          <p className="text-zinc-400 text-sm md:text-base">
            رضایت شما بزرگ‌ترین پاداش ماست. ما متعهد به ارائه بالاترین سطح خدمات لوکس آرایشی هستیم.
          </p>
        </div>

        {reviews.length === 0 ? (
          <p className="text-center text-zinc-500 text-sm py-12">هنوز نظری ثبت نشده است.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="glass p-6 rounded-2xl border border-zinc-900/80 hover:border-zinc-800 transition-all flex flex-col justify-between relative group"
              >
                <div className="absolute top-6 left-6 text-zinc-900 opacity-20 pointer-events-none">
                  <MessageSquare className="w-12 h-12" />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-4 relative z-10">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(review.rating) ? 'text-amber-500 fill-amber-500' : 'text-zinc-800'}`}
                      />
                    ))}
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-6 italic relative z-10">”{review.comment}“</p>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-900/80 pt-4 mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-bold border border-amber-500/15">
                      {review.customerName.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-zinc-100">{review.customerName}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-semibold">{toPersianDigits(review.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
