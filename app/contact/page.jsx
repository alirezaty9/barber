import Link from 'next/link';
import { Phone, MessageSquareWarning, Instagram } from 'lucide-react';
import { SHOP_NAME, SHOP_EMAIL, SHOP_PHONE_DISPLAY, SHOP_INSTAGRAM } from '@/lib/shop';
import { toPersianDigits } from '@/lib/persian';
import { REFUND_SETTLEMENT_HOURS } from '@/lib/features';
import InfoPageShell from '@/features/info/InfoPageShell';
import InfoSection from '@/features/info/InfoSection';
import ShopContactLines from '@/features/info/ShopContactLines';
import ShopMap from '@/features/info/ShopMap';

export const metadata = {
  title: `تماس با ما | ${SHOP_NAME}`,
  description: `نشانی، شماره تماس، ساعات پاسخگویی، موقعیت روی نقشه و مسیر رسیدگی به شکایات ${SHOP_NAME}`,
};

// صفحه‌ی «تماس با ما».
//
// 🎯 چرا صفحه‌ی جدا؟ اطلاعاتِ تماس از قبل در پایینِ صفحه‌ی اصلی بود، ولی چک‌لیستِ ارزیابِ
// اینماد «صفحه‌ی تماس با ما» را یک بندِ مستقل می‌شمارد و ارزیاب دنبالِ لینکی با همین نام
// می‌گردد. به‌علاوه یک بندِ جداگانه «سامانه‌ی دریافتِ شکایات» می‌خواهد که سایت هیچ نسخه‌ای
// از آن نداشت.
//
// 📌 نشانی، کدِ پستی، تلفنِ ثابت، موبایل و ایمیل همه از قطعه‌ی مشترک می‌آیند تا با پایینِ
// صفحه‌ی اصلی و صفحه‌ی قوانین هیچ‌وقت اختلاف پیدا نکنند.
export default function ContactPage() {
  return (
    <InfoPageShell
      icon={Phone}
      title="تماس با ما"
      intro={`برای رزرو نوبت نیازی به تماس نیست و همه‌چیز از خودِ سایت انجام می‌شود؛ ولی برای هماهنگی، جابه‌جاییِ نوبت یا هر پرسشی می‌توانید از راه‌های زیر با ${SHOP_NAME} در ارتباط باشید.`}
    >
      <div className="glass p-6 rounded-3xl border border-amber-500/20 space-y-3">
        <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-amber-500">
          <Phone className="w-4 h-4 flex-shrink-0" />
          نشانی و شماره‌های تماس
        </h2>
        <div className="space-y-3 text-xs">
          <ShopContactLines />
        </div>
        {SHOP_INSTAGRAM && (
          <a
            href={SHOP_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400"
          >
            <Instagram className="w-4 h-4" />
            <span>صفحه‌ی اینستاگرام مجموعه</span>
          </a>
        )}
      </div>

      {/* بندِ شکایات — همان متنِ صفحه‌ی قوانین، ولی اینجا هم می‌آید چون ارزیاب ممکن است
          فقط یکی از این دو صفحه را باز کند. */}
      <InfoSection icon={MessageSquareWarning} title="ثبت و رسیدگی به شکایات">
        <li>
          اگر از خدمات، فرایندِ رزرو یا پرداخت شکایتی دارید، از این راه‌ها اعلام کنید:{' '}
          {SHOP_EMAIL ? (
            <>
              ایمیلِ <span className="font-mono" dir="ltr">{SHOP_EMAIL}</span> یا تماس با شماره‌ی{' '}
              <span className="font-mono">{SHOP_PHONE_DISPLAY}</span>.
            </>
          ) : (
            <>تماس با شماره‌ی <span className="font-mono">{SHOP_PHONE_DISPLAY}</span>.</>
          )}
        </li>
        <li>
          لطفاً <b>کدِ رهگیریِ نوبت</b> و شماره‌ی موبایلی که با آن رزرو کرده‌اید را ذکر کنید تا
          پیگیری ممکن باشد.
        </li>
        <li>
          شکایات در ساعاتِ کاری بررسی می‌شود و نتیجه‌اش حداکثر تا{' '}
          {toPersianDigits(String(REFUND_SETTLEMENT_HOURS))} ساعت به شما اعلام می‌گردد.
        </li>
        <li>
          شرایطِ انصراف و بازگشتِ وجه در صفحه‌ی{' '}
          <Link href="/terms" className="text-amber-500 hover:text-amber-400 font-bold">قوانین و مقررات</Link>{' '}
          به‌تفصیل آمده است. معرفیِ مجموعه هم در صفحه‌ی{' '}
          <Link href="/about" className="text-amber-500 hover:text-amber-400 font-bold">دربارهٔ ما</Link>{' '}
          است.
        </li>
      </InfoSection>

      <div className="glass p-6 rounded-3xl border border-zinc-800">
        <ShopMap />
      </div>
    </InfoPageShell>
  );
}
