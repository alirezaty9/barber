import Link from 'next/link';
import { Scissors, FileText, CreditCard, CalendarClock, XCircle, ShieldCheck, Phone, MapPin } from 'lucide-react';
import { SHOP_NAME, SHOP_ADDRESS, SHOP_PHONE_LINK, SHOP_PHONE_DISPLAY, SHOP_HOURS } from '@/lib/shop';
import { TIME_SLOTS, SLOT_STEP_MIN } from '@/lib/constants';
import { toPersianDigits } from '@/lib/persian';

export const metadata = {
  title: 'قوانین و مقررات | banad barber',
  description: 'شرایط رزرو نوبت، پرداخت آنلاین، لغو نوبت و حریم خصوصی در سامانه رزرو banad barber',
};

// صفحه‌ی «قوانین و مقررات» — یکی از صفحاتی که درگاه‌های پرداخت (زرین‌پال) هنگامِ بررسیِ
// سایت انتظار دارند ببینند. محتوا عمداً با رفتارِ واقعیِ اپ هماهنگ نوشته شده: مبلغِ کامل
// به‌عنوان پیش‌پرداخت آنلاین گرفته می‌شود، پرداختِ ناموفق نوبت را آزاد می‌کند، و لغو
// فعلاً فقط تلفنی است (چون سامانه‌ی پیامکِ کدِ تأیید هنوز فعال نشده).
export default function TermsPage() {
  const firstSlot = TIME_SLOTS[0];
  const lastSlot = TIME_SLOTS[TIME_SLOTS.length - 1];

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg shadow-lg">
            <Scissors className="w-5 h-5 text-black" />
          </div>
          <span dir="ltr" className="font-sans font-extrabold text-xl tracking-wider text-amber-500">
            banad <span className="text-white">barber</span>
          </span>
        </Link>

        <div className="flex flex-col items-center text-center mb-10">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">قوانین و مقررات</h1>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-md">
            استفاده از سامانه‌ی رزرو آنلاین {SHOP_NAME} به معنای پذیرش شرایط زیر است. لطفاً پیش از
            ثبت نوبت، این صفحه را بخوانید.
          </p>
        </div>

        <div className="space-y-4">
          <Section icon={CalendarClock} title="۱. نحوه‌ی رزرو نوبت">
            <li>رزرو نوبت فقط از طریق همین سایت و با انتخاب خدمت، روز و ساعت انجام می‌شود.</li>
            <li>
              هر نوبت {toPersianDigits(String(SLOT_STEP_MIN))} دقیقه در نظر گرفته شده و ساعت‌های
              کاری از {toPersianDigits(firstSlot)} تا آخرین نوبتِ ساعت {toPersianDigits(lastSlot)} است
              ({SHOP_HOURS}).
            </li>
            <li>
              برای ثبت نوبت، وارد کردن «نام و نام خانوادگی» و «شماره موبایل» الزامی است. مسئولیت
              درستیِ این اطلاعات با کاربر است؛ در صورت اشتباه بودن شماره، امکان هماهنگی وجود نخواهد داشت.
            </li>
            <li>
              هر بازه‌ی زمانی فقط به یک نفر اختصاص می‌یابد و انتخاب زمان به‌صورت لحظه‌ای بررسی می‌شود.
            </li>
          </Section>

          <Section icon={CreditCard} title="۲. پرداخت و تأیید نوبت">
            <li>
              رزرو نوبت مستلزم پرداخت آنلاینِ <span className="text-amber-400 font-bold">کل مبلغ خدمت</span> به‌عنوان
              پیش‌پرداخت است. مبلغ هر خدمت پیش از پرداخت در همان صفحه نمایش داده می‌شود.
            </li>
            <li>پرداخت از طریق درگاه بانکی انجام می‌شود و اطلاعات کارت هرگز در این سایت ذخیره یا مشاهده نمی‌شود.</li>
            <li>
              نوبت تنها پس از تأیید موفقیت پرداخت توسط درگاه، قطعی و «تایید شده» می‌شود و کد رهگیری
              به کاربر نمایش داده می‌شود.
            </li>
            <li>
              در صورت انصراف یا ناموفق بودن پرداخت، نوبت ثبت نمی‌شود و آن بازه‌ی زمانی مجدداً برای
              دیگران آزاد می‌گردد.
            </li>
            <li>
              اگر کاربر وارد درگاه شود ولی پرداخت را کامل نکند، نوبتِ نیمه‌تمام حداکثر تا
              ۱۵ دقیقه نگه داشته و سپس آزاد می‌شود.
            </li>
          </Section>

          <Section icon={XCircle} title="۳. لغو یا تغییر نوبت">
            <li>
              در حال حاضر امکان لغو نوبت به‌صورت آنلاین در سایت فراهم نیست.
            </li>
            <li>
              برای هرگونه لغو، تغییر یا جابه‌جایی نوبت، لازم است با شماره‌ی تماس مجموعه هماهنگ
              کنید و کد رهگیری خود را اعلام نمایید.
            </li>
            <li>
              تعیین تکلیف مبلغ پرداخت‌شده در چنین مواردی، با هماهنگی مستقیم مجموعه انجام می‌شود.
            </li>
            <li>
              چنانچه مجموعه به هر دلیل نتواند نوبت رزروشده را ارائه کند، پیش از زمان نوبت با شما
              تماس گرفته خواهد شد.
            </li>
          </Section>

          <Section icon={ShieldCheck} title="۴. حریم خصوصی و اطلاعات کاربران">
            <li>
              اطلاعاتی که ذخیره می‌شود محدود است به: نام، شماره موبایل، خدمت انتخابی، تاریخ و ساعت
              نوبت، و وضعیت پرداخت. هیچ اطلاعات بانکی نزد ما نگهداری نمی‌شود.
            </li>
            <li>این اطلاعات صرفاً برای مدیریت نوبت‌ها و اطلاع‌رسانی به کاربر استفاده می‌شود و در اختیار شخص ثالث قرار نمی‌گیرد.</li>
            <li>
              کاربر می‌تواند با وارد کردن شماره موبایل خود در صفحه‌ی{' '}
              <Link href="/track" className="text-amber-500 hover:text-amber-400 font-bold">رهگیری نوبت</Link>{' '}
              وضعیت نوبت‌هایش را مشاهده کند.
            </li>
          </Section>

          <Section icon={CalendarClock} title="۵. حضور در نوبت">
            <li>لطفاً چند دقیقه پیش از زمان نوبت در محل حاضر باشید.</li>
            <li>
              تأخیر بیش از ۱۵ دقیقه ممکن است به لغو نوبت یا کوتاه شدن زمان خدمت منجر شود، زیرا
              نوبت‌های بعدی پشت سر هم تنظیم شده‌اند.
            </li>
          </Section>

          <Section icon={FileText} title="۶. تغییر قوانین">
            <li>
              مجموعه می‌تواند این شرایط را به‌روزرسانی کند. نسخه‌ی معتبر همواره همین صفحه است و
              ملاکِ هر نوبت، قوانینِ زمانِ ثبت آن نوبت است.
            </li>
          </Section>

          {/* اطلاعات تماس — درگاه‌های پرداخت هنگام بررسی سایت این بخش را هم می‌بینند. */}
          <div className="glass p-6 rounded-3xl border border-amber-500/20 space-y-3">
            <h2 className="text-sm font-extrabold text-amber-500">راه‌های ارتباط با ما</h2>
            <div className="flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-zinc-400 leading-relaxed">{SHOP_ADDRESS}</span>
            </div>
            <a href={`tel:${SHOP_PHONE_LINK}`} className="flex items-center gap-2.5 text-xs hover:text-amber-500 transition-colors">
              <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="font-mono text-zinc-400">{SHOP_PHONE_DISPLAY}</span>
            </a>
            <p className="text-[11px] text-zinc-500">{SHOP_HOURS}</p>
          </div>
        </div>

        <Link href="/" className="block text-center text-xs text-zinc-500 hover:text-amber-400 mt-8 transition-colors">
          ← بازگشت به صفحه‌ی اصلی
        </Link>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="glass p-6 rounded-3xl border border-zinc-800">
      <h2 className="flex items-center gap-2.5 text-sm font-extrabold text-white mb-4">
        <Icon className="w-4 h-4 text-amber-500 flex-shrink-0" />
        {title}
      </h2>
      <ul className="space-y-2.5 text-xs text-zinc-400 leading-relaxed list-disc pr-4 marker:text-amber-500/60">
        {children}
      </ul>
    </section>
  );
}
