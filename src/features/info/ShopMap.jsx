import { MapPin } from 'lucide-react';
import { SHOP_NAME, SHOP_ADDRESS, SHOP_LAT as LAT, SHOP_LNG as LNG } from '@/lib/shop';

// نقشه‌ی موقعیتِ مکانیِ مجموعه + لینکِ مسیریابی.
//
// در دو جا استفاده می‌شود: پایینِ صفحه‌ی اصلی و صفحه‌ی «تماس با ما». قطعه‌ی مشترک شد تا
// مختصاتِ نقشه و متنِ زیرش در دو جا از هم جدا نیفتند.
export default function ShopMap({ id, className = '' }) {
  return (
    <div id={id} className={className}>
      <div className="flex items-center gap-2 mb-3 text-sm text-zinc-100 font-bold">
        <MapPin className="w-4 h-4 text-amber-500" />
        <span>موقعیت روی نقشه</span>
      </div>
      <div className="rounded-2xl overflow-hidden border border-zinc-800">
        <iframe
          title={`نقشه موقعیت ${SHOP_NAME}`}
          src={`https://maps.google.com/maps?q=${LAT},${LNG}&z=17&output=embed`}
          className="w-full h-64 md:h-80"
          style={{ border: 0, filter: 'grayscale(0.4) invert(0.9) hue-rotate(180deg)' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
        <p className="text-[11px] text-zinc-500 leading-relaxed">{SHOP_ADDRESS}</p>
        {/* لینکِ بیرونی عمداً در پنجره‌ی تازه باز می‌شود — هم تجربه‌ی بهتری است و هم
            یکی از بندهای چک‌لیستِ اینماد همین را می‌خواهد. */}
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
  );
}
