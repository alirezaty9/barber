import Link from 'next/link';
import { Info, Store, Sparkles, CalendarClock, Phone } from 'lucide-react';
import { SHOP_NAME, SHOP_INTRO, SHOP_OWNER, SHOP_ADDRESS } from '@/lib/shop';
import { SLOT_STEP_MIN } from '@/lib/constants';
import { toPersianDigits } from '@/lib/persian';
import { REFUND_POLICY_NOTE } from '@/lib/features';
import InfoPageShell from '@/features/info/InfoPageShell';
import InfoSection from '@/features/info/InfoSection';
import ShopContactLines from '@/features/info/ShopContactLines';

export const metadata = {
  title: `دربارهٔ ما | ${SHOP_NAME}`,
  description: `معرفی مجموعه ${SHOP_NAME}، خدمات ارائه‌شده، محل فعالیت و راه‌های ارتباطی`,
};

// صفحه‌ی «دربارهٔ ما».
//
// 🎯 چرا ساخته شد؟ پیش از این، متنِ معرفیِ مجموعه فقط در پایینِ صفحه‌ی اصلی بود و
// **هیچ لینکی به آن نمی‌رسید** — نه در نوارِ بالا و نه در فهرستِ دسترسیِ سریع. یکی از
// بندهای چک‌لیستِ ارزیابِ اینماد صفحه‌ی «دربارهٔ ما» با معرفیِ مالکِ کسب‌وکار است و ارزیاب
// دنبالِ لینکی با همین نام می‌گردد؛ اگر پیدا نکند، آن بند را رد می‌کند حتی اگر متن جایی باشد.
//
// 📌 نامِ مالک از SHOP_OWNER می‌آید و تا وقتی خالی است، آن جمله اصلاً نوشته نمی‌شود.
export default function AboutPage() {
  return (
    <InfoPageShell
      icon={Info}
      title="دربارهٔ ما"
      intro={SHOP_INTRO}
    >
      <InfoSection icon={Store} title="ما چه کسی هستیم">
        <li>
          <b>{SHOP_NAME}</b> یک آرایشگاهِ تخصصیِ آقایان است که خدماتش را به‌صورتِ{' '}
          <b>حضوری و با نوبتِ قبلی</b> در محلِ خود ارائه می‌کند.
        </li>
        {SHOP_OWNER && (
          <li>
            مدیریتِ مجموعه: <b>{SHOP_OWNER}</b>
          </li>
        )}
        <li>
          محلِ فعالیت: {SHOP_ADDRESS}
        </li>
        <li>
          این سایت فروشگاهِ کالا نیست؛ تنها کارکردش <b>رزروِ آنلاینِ نوبت</b> برای همان
          خدماتِ حضوری است. هیچ کالایی ارسال نمی‌شود و هزینه‌ی ارسال وجود ندارد.
        </li>
      </InfoSection>

      <InfoSection icon={Sparkles} title="چه خدماتی ارائه می‌دهیم">
        <li>
          فهرستِ کاملِ خدمات همراه با <b>توضیح و قیمتِ هر خدمت</b> در{' '}
          <Link href="/#services" className="text-amber-500 hover:text-amber-400 font-bold">منوی خدمات</Link>{' '}
          صفحه‌ی اصلی آمده است. قیمت‌ها به تومان و نهایی هستند.
        </li>
        <li>
          می‌توانید یک خدمت یا چند خدمت را با هم انتخاب کنید. در هر دو حالت،
          مدتِ نوبت {toPersianDigits(String(SLOT_STEP_MIN))} دقیقه در نظر گرفته می‌شود تا
          کارِ شما بدونِ عجله انجام شود.
        </li>
      </InfoSection>

      <InfoSection icon={CalendarClock} title="چطور نوبت بگیرید">
        <li>در صفحه‌ی اصلی خدمتِ موردنظرتان را انتخاب کنید.</li>
        <li>روز و ساعتِ خالی را از تقویم انتخاب کنید (فقط ساعت‌های آزاد نشان داده می‌شوند).</li>
        <li>نام و شماره‌ی موبایلتان را وارد کنید و مبلغِ نهایی را ببینید.</li>
        <li>پرداخت را در درگاهِ بانکی کامل کنید؛ نوبت پس از پرداختِ موفق قطعی می‌شود.</li>
        <li>
          کدِ رهگیری را نگه دارید. هر زمان می‌توانید وضعیتِ نوبتتان را در صفحه‌ی{' '}
          <Link href="/track" className="text-amber-500 hover:text-amber-400 font-bold">رهگیری نوبت</Link>{' '}
          ببینید.
        </li>
        <li>
          {REFUND_POLICY_NOTE} شرایطِ کاملِ انصراف و بازگشتِ وجه در صفحه‌ی{' '}
          <Link href="/terms" className="text-amber-500 hover:text-amber-400 font-bold">قوانین و مقررات</Link>{' '}
          آمده است.
        </li>
      </InfoSection>

      <div className="glass p-6 rounded-3xl border border-amber-500/20 space-y-3">
        <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-amber-500">
          <Phone className="w-4 h-4 flex-shrink-0" />
          راه‌های ارتباط با ما
        </h2>
        <div className="space-y-3 text-xs">
          <ShopContactLines />
        </div>
        <Link href="/contact" className="inline-block text-xs font-bold text-amber-500 hover:text-amber-400">
          صفحه‌ی تماس با ما و نقشه ←
        </Link>
      </div>
    </InfoPageShell>
  );
}
