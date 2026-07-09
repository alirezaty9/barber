import { Scissors, MapPin, Phone, Instagram, Clock } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';

export default function Footer() {
  const currentYear = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date());
  // آدرس دقیق مغازه + مختصات جغرافیایی دقیق برای نقشه.
  const ADDRESS = 'مهرشهر، بلوار ارم، نبش خیابان ۱۰۰ غربی، ساختمان آناهیتا، طبقه ۳، واحد ۱۲';
  const LAT = 35.811706;
  const LNG = 50.903386;

  return (
    <footer id="about" className="bg-[#020202] border-t border-zinc-900 text-zinc-400 py-16 px-6 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Scissors className="w-5 h-5 text-amber-500" />
            </div>
            <span dir="ltr" className="font-sans font-bold text-lg tracking-wider text-amber-500">
              banad <span className="text-white">barber</span>
            </span>
          </div>
          <p className="text-zinc-500 text-xs md:text-sm leading-relaxed max-w-sm">
            ارائه برترین خدمات هیرکات، طراحی ریش و استایل تخصصی آقایان در فضایی لوکس و آرامش‌بخش با تکیه بر استانداردهای روز دنیا.
          </p>
          <div id="social" className="flex items-center gap-3 pt-2 scroll-mt-24">
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام" className="p-2 bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 text-zinc-400 hover:text-amber-500 rounded-xl transition-all">
              <Instagram className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-zinc-100 font-bold text-sm mb-4">دسترسی سریع</h4>
          <ul className="space-y-2.5 text-xs">
            <li><a href="#hero" className="hover:text-amber-500 transition-colors">خانه / صفحه اصلی</a></li>
            <li><a href="#services" className="hover:text-amber-500 transition-colors">منو خدمات و قیمت‌ها</a></li>
            <li><a href="#contact" className="hover:text-amber-500 transition-colors">ارتباط با ما</a></li>
            <li><a href="/track" className="hover:text-amber-500 transition-colors">رهگیری نوبت</a></li>
          </ul>
        </div>

        <div id="contact" className="space-y-4 text-xs scroll-mt-24">
          <h4 className="text-zinc-100 font-bold text-sm">ارتباط با ما</h4>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed text-zinc-500">{ADDRESS}</span>
          </div>
          <a href="tel:+989195496929" className="flex items-center gap-2.5 hover:text-amber-500 transition-colors">
            <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="font-mono text-zinc-500">{toPersianDigits('۰۹۱۹۵۴۹۶۹۲۹')}</span>
          </a>
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>شنبه تا جمعه: ۹ صبح تا ۱۰ شب</span>
          </div>
        </div>
      </div>

      {/* نقشه‌ی موقعیت مکانی — هدف اسکرول آیکون لوکیشن در هدر */}
      <div id="location" className="max-w-7xl mx-auto mt-12 scroll-mt-24">
        <div className="flex items-center gap-2 mb-3 text-sm text-zinc-100 font-bold">
          <MapPin className="w-4 h-4 text-amber-500" />
          <span>موقعیت روی نقشه</span>
        </div>
        <div className="rounded-2xl overflow-hidden border border-zinc-800">
          <iframe
            title="نقشه موقعیت banad barber"
            src={`https://maps.google.com/maps?q=${LAT},${LNG}&z=17&output=embed`}
            className="w-full h-64 md:h-80"
            style={{ border: 0, filter: 'grayscale(0.4) invert(0.9) hue-rotate(180deg)' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
          <p className="text-[11px] text-zinc-500 leading-relaxed">{ADDRESS}</p>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-amber-500 hover:text-amber-400 whitespace-nowrap"
          >
            مسیریابی روی نقشه ←
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-zinc-900/60 mt-12 pt-6 text-center text-[10px] text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {toPersianDigits(currentYear)} banad barber. تمامی حقوق مادی و معنوی محفوظ است.</p>
        <p className="text-zinc-700">طراحی شده با تم دارک مینیمال جهت رزرو نوبت آنلاین سریع</p>
      </div>
    </footer>
  );
}
