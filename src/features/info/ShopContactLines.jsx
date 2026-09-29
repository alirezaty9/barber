import { MapPin, Phone, PhoneCall, Mail, Clock } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';
import {
  SHOP_ADDRESS,
  SHOP_POSTAL_CODE,
  SHOP_PHONE_LINK,
  SHOP_PHONE_DISPLAY,
  SHOP_LANDLINE,
  SHOP_EMAIL,
  SHOP_HOURS,
} from '@/lib/shop';

// بلوکِ «راه‌های ارتباط با ما» — یک قطعه که در چهار جای سایت استفاده می‌شود:
// پایینِ صفحه‌ی اصلی، صفحه‌ی «تماس با ما»، صفحه‌ی «دربارهٔ ما» و صفحه‌ی «قوانین و مقررات».
//
// 🎯 چرا قطعه‌ی مشترک؟ قبلاً این چند خط در پایینِ صفحه‌ی اصلی و صفحه‌ی قوانین دو نسخه‌ی
// جداگانه داشت. حالا که کدِ پستی و تلفنِ ثابت و ایمیل هم اضافه شده‌اند، دو نسخه یعنی
// نصفِ سایت روزی ناقص می‌ماند — و همین ناقص‌بودن دقیقاً چیزی است که ارزیابِ اینماد
// دنبالش می‌گردد.
//
// 🔑 هر خطی که مقدارش در src/lib/shop.js خالی باشد، **اصلاً رندر نمی‌شود**.
export default function ShopContactLines({
  valueClassName = 'text-zinc-400',
  showHours = true,
}) {
  return (
    <>
      <div className="flex items-start gap-2.5">
        <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className={`leading-relaxed ${valueClassName}`}>{SHOP_ADDRESS}</p>
          {SHOP_POSTAL_CODE && (
            <p className={`leading-relaxed ${valueClassName}`}>
              کدپستی: <span className="font-mono">{toPersianDigits(SHOP_POSTAL_CODE)}</span>
            </p>
          )}
        </div>
      </div>

      {SHOP_LANDLINE && (
        <a href={`tel:${SHOP_LANDLINE}`} className="flex items-center gap-2.5 hover:text-amber-500 transition-colors">
          <PhoneCall className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className={valueClassName}>
            تلفن ثابت: <span className="font-mono">{toPersianDigits(SHOP_LANDLINE)}</span>
          </span>
        </a>
      )}

      <a href={`tel:${SHOP_PHONE_LINK}`} className="flex items-center gap-2.5 hover:text-amber-500 transition-colors">
        <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className={valueClassName}>
          موبایل: <span className="font-mono">{SHOP_PHONE_DISPLAY}</span>
        </span>
      </a>

      {SHOP_EMAIL && (
        <a href={`mailto:${SHOP_EMAIL}`} className="flex items-center gap-2.5 hover:text-amber-500 transition-colors">
          <Mail className="w-4 h-4 text-amber-500 flex-shrink-0" />
          {/* ⚠️ آدرسِ ایمیل عمداً لاتین می‌ماند و به فارسی تبدیل نمی‌شود، وگرنه
              قابلِ کپی‌کردن و قابلِ استفاده نخواهد بود. */}
          <span className={`${valueClassName} font-mono`} dir="ltr">{SHOP_EMAIL}</span>
        </a>
      )}

      {showHours && (
        <div className="flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <span className={`leading-relaxed ${valueClassName}`}>{SHOP_HOURS}</span>
        </div>
      )}
    </>
  );
}
