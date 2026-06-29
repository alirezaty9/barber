import { Scissors, MapPin, Phone, Instagram, Clock } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';

export default function Footer() {
  const currentYear = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date());

  return (
    <footer id="about" className="bg-[#020202] border-t border-zinc-900 text-zinc-400 py-16 px-6 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Scissors className="w-5 h-5 text-amber-500" />
            </div>
            <span className="font-sans font-bold text-lg tracking-wider text-amber-500">
              پیرایش <span className="text-white">رویال</span>
            </span>
          </div>
          <p className="text-zinc-500 text-xs md:text-sm leading-relaxed max-w-sm">
            ارائه برترین خدمات آرایش و پیرایش آقایان، حالت‌دهی مو، خط زنی تخصصی ریش و گریم لوکس چهره در فضایی لوکس و آرامش‌بخش با تکیه بر استانداردهای روز دنیا.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <a href="#" aria-label="اینستاگرام" className="p-2 bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 text-zinc-400 hover:text-amber-500 rounded-xl transition-all">
              <Instagram className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-zinc-100 font-bold text-sm mb-4">دسترسی سریع</h4>
          <ul className="space-y-2.5 text-xs">
            <li><a href="#hero" className="hover:text-amber-500 transition-colors">خانه / صفحه اصلی</a></li>
            <li><a href="#services" className="hover:text-amber-500 transition-colors">منو خدمات و قیمت‌ها</a></li>
            <li><a href="#barbers" className="hover:text-amber-500 transition-colors">استایلیست‌های برتر</a></li>
            <li><a href="#reviews" className="hover:text-amber-500 transition-colors">نظرات مشتریان</a></li>
          </ul>
        </div>

        <div className="space-y-4 text-xs">
          <h4 className="text-zinc-100 font-bold text-sm">ارتباط با ما</h4>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed text-zinc-500">مهرشهر، خیابان صد</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="font-mono text-zinc-500">{toPersianDigits('۰۹۱۹۵۴۹۶۹۲۹')}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>شنبه تا جمعه: ۹ صبح تا ۱۰ شب</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-zinc-900/60 mt-12 pt-6 text-center text-[10px] text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {toPersianDigits(currentYear)} پیرایش رویال. تمامی حقوق مادی و معنوی محفوظ است.</p>
        <p className="text-zinc-700">طراحی شده با تم دارک مینیمال جهت رزرو نوبت آنلاین سریع</p>
      </div>
    </footer>
  );
}
