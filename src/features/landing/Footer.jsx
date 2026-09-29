import Link from 'next/link';
import { Scissors, Instagram } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';
import { SHOP_NAME, SHOP_INTRO, SHOP_INSTAGRAM } from '@/lib/shop';
import ShopContactLines from '@/features/info/ShopContactLines';
import ShopMap from '@/features/info/ShopMap';
import BrandWordmark from './BrandWordmark';

export default function Footer() {
  // ⚠️ تایم‌زون صریح است، چون این متن روی سرور ساخته می‌شود و سرور معمولاً UTC است.
  // بینِ نیمه‌شب تا ۳:۳۰ بامدادِ تهران، تاریخِ UTC هنوز روزِ قبل است — یعنی در شبِ نوروز
  // فوتر برای چند ساعت سالِ گذشته را نشان می‌داد.
  const currentYear = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', year: 'numeric' }).format(new Date());

  return (
    <footer id="about" className="bg-[#020202] border-t border-zinc-900 text-zinc-400 py-16 px-6 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
              <Scissors className="w-5 h-5 text-amber-500" />
            </div>
            <BrandWordmark className="font-sans font-bold text-lg tracking-wider text-amber-500" accentClassName="text-white" />
          </div>
          {/* متنِ معرفی از src/lib/shop.js می‌آید تا با صفحه‌ی «دربارهٔ ما» یکی بماند. */}
          <p className="text-zinc-500 text-xs md:text-sm leading-relaxed max-w-sm">{SHOP_INTRO}</p>
          {/* 🔴 چرا Link و نه <a>؟ با <a> مرورگر کلِ سایت را از صفر می‌سازد (HTML دوباره،
              جاوااسکریپت دوباره، فونت و عکس دوباره) و صفحه یک لحظه سفید می‌شود. با Link فقط
              تکه‌ی عوض‌شده از سرور گرفته می‌شود و بقیه‌ی سایت دست‌نخورده می‌ماند — تقریباً آنی.
              نوارِ بالای صفحه از اول Link داشت؛ همین لینک‌ها در فوتر <a> بودند و محسوس
              کندتر کار می‌کردند. */}
          <Link href="/about" className="inline-block text-xs font-bold text-amber-500 hover:text-amber-400">
            دربارهٔ ما بیشتر بخوانید ←
          </Link>
          {/* تا وقتی آدرسِ پیجِ واقعی در shop.js پر نشده، آیکون نمایش داده نمی‌شود —
              لینکِ جای‌نگهدار مشتری را به صفحه‌ی اصلیِ اینستاگرام می‌برد، نه به پیجِ مجموعه. */}
          {SHOP_INSTAGRAM && (
            <div id="social" className="flex items-center gap-3 pt-2 scroll-mt-24">
              <a href={SHOP_INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام" className="p-2 bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 text-zinc-400 hover:text-amber-500 rounded-xl transition-all">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        <div>
          <h4 className="text-zinc-100 font-bold text-sm mb-4">دسترسی سریع</h4>
          <ul className="space-y-2.5 text-xs">
            {/* این دو لنگرِ داخلِ همین صفحه‌اند (اسکرول)، نه رفتن به صفحه‌ی دیگر — پس <a>
                درست است و Link هیچ سودی ندارد. */}
            <li><a href="#hero" className="hover:text-amber-500 transition-colors">خانه / صفحه اصلی</a></li>
            <li><a href="#services" className="hover:text-amber-500 transition-colors">منو خدمات و قیمت‌ها</a></li>
            {/* 🔴 «دربارهٔ ما» و «تماس با ما» صفحه‌های مستقل‌اند، نه لنگرِ داخلِ همین صفحه.
                چک‌لیستِ ارزیابِ اینماد این دو را دو بندِ جدا می‌شمارد و دنبالِ لینکی با
                دقیقاً همین نام‌ها می‌گردد؛ قبلاً هیچ لینکی با این نام‌ها در سایت نبود. */}
            <li><Link href="/about" className="hover:text-amber-500 transition-colors">دربارهٔ ما</Link></li>
            <li><Link href="/contact" className="hover:text-amber-500 transition-colors">تماس با ما</Link></li>
            <li><Link href="/track" className="hover:text-amber-500 transition-colors">رهگیری نوبت</Link></li>
            <li><Link href="/terms" className="hover:text-amber-500 transition-colors">قوانین و مقررات</Link></li>
          </ul>
        </div>

        <div id="contact" className="space-y-4 text-xs scroll-mt-24">
          <h4 className="text-zinc-100 font-bold text-sm">ارتباط با ما</h4>
          {/* نشانی، کدِ پستی، تلفنِ ثابت، موبایل و ایمیل از قطعه‌ی مشترک می‌آیند تا با
              صفحه‌های «تماس با ما»، «دربارهٔ ما» و «قوانین» هیچ‌وقت اختلاف پیدا نکنند. */}
          <ShopContactLines valueClassName="text-zinc-500" />
          <Link href="/contact" className="inline-block font-bold text-amber-500 hover:text-amber-400">
            صفحه‌ی تماس با ما ←
          </Link>
        </div>
      </div>

      {/* نقشه‌ی موقعیت مکانی — هدف اسکرول آیکون لوکیشن در هدر.
          شناسه‌ی location باید بماند، وگرنه آیکنِ لوکیشنِ بالای صفحه به هیچ‌جا نمی‌رود. */}
      <ShopMap id="location" className="max-w-7xl mx-auto mt-12 scroll-mt-24" />

      <div className="max-w-7xl mx-auto border-t border-zinc-900/60 mt-12 pt-6 text-center text-[10px] text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {toPersianDigits(currentYear)} {SHOP_NAME}. تمامی حقوق مادی و معنوی محفوظ است.</p>
        <div className="flex items-center gap-4">
          {/* لینکِ ورودِ مدیریت عمداً نگه داشته شد: آدرسِ /admin به‌هرحال حدس‌زدنی است و
              امنیت را رمز تأمین می‌کند نه پنهان‌بودنِ مسیر — ولی نبودش برای صاحبِ مجموعه
              یعنی راهِ ورودِ در دسترسی ندارد. (میان‌برِ مانیفست اما حذف شد، چون آن روی
              گوشیِ *مشتری‌ها* هم ظاهر می‌شد.) */}
          {/* ⚠️ prefetch={false} فقط روی همین یکی. Next لینک‌ها را وقتی در دیدِ کاربر
              می‌آیند از پیش می‌گیرد تا کلیک آنی باشد؛ ولی این یکی مسیرِ پشتِ ورود است و
              پیش‌گرفتنش یعنی هر بازدیدکننده‌ی معمولیِ سایت، بی‌آنکه کلیک کند، یک درخواستِ
              بی‌فایده به مسیرِ مدیریت می‌فرستد. */}
          <Link href="/admin" prefetch={false} className="text-zinc-700 hover:text-amber-500 transition-colors">پنل مدیریت</Link>
          <p className="text-zinc-700">طراحی شده با تم دارک مینیمال جهت رزرو نوبت آنلاین سریع</p>
        </div>
      </div>
    </footer>
  );
}
