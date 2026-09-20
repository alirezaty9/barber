// ─────────────────────────────────────────────────────────────
//  محاسباتِ داشبوردِ مدیریت — منطقِ خالص، بدونِ دیتابیس و بدونِ React.
//
//  🎯 چرا این فایل جدا شد؟ این محاسبات قبلاً وسطِ خودِ صفحه نوشته شده بودند و
//     **هیچ راهی برای تست‌شدن نداشتند** — در حالی که پرخطرترین بخشِ اپ‌اند: هر عددی که
//     صاحبِ کسب‌وکار بر اساسش تصمیم می‌گیرد از اینجا می‌آید. سه باگِ جدی (درآمدِ ماه،
//     طلبِ وصول‌نشده، درآمدِ هر خدمت) فقط با بازخوانیِ دستیِ کد پیدا شدند، نه با تست.
//
//  🧱 قاعده‌ی این فایل: هیچ تابعی اینجا به prisma، به تاریخِ «الان»، یا به React دست نمی‌زند.
//     هر چیزی که از بیرون لازم است (لیستِ رزروها، امروز، زمانِ فعلی) پارامتر است.
//     صفحه فقط داده را می‌گیرد، این توابع را صدا می‌زند و نتیجه را می‌چیند.
// ─────────────────────────────────────────────────────────────

import { PENDING_HOLD_MS } from './constants';
import { servicesLabelOf } from './serializers';
import { jalaliYM } from './persian';
import { shiftISO } from './time';

/**
 * آیا پولِ این نوبت واقعاً به دستِ آرایشگاه رسیده؟
 *
 * «در انتظار استرداد» هم پولش دریافت شده و هنوز برنگشته، پس باید دیده شود — وگرنه یک
 * نوبتِ پرداخت‌شده در هیچ‌کدام از عددهای داشبورد (نه درآمد، نه طلب، نه مسترد) نمی‌آمد و
 * بی‌صدا از حسابداری حذف می‌شد.
 */
export const isReceived = (b) =>
  b.paymentStatus === 'paid' || b.paymentStatus === 'refunded' || b.paymentStatus === 'refundPending';

/** درآمدِ خالصِ یک نوبت: مبلغِ دریافتی منهای آنچه مسترد شده. */
export const netOf = (b) => (isReceived(b) ? b.amount - (b.refundAmount || 0) : 0);

/** طولِ بازه‌های روزشمار به روز. بازه‌های «امسال» و «کل دوره» تقویمی‌اند و اینجا نیستند. */
const PERIOD_DAYS = { today: 1, 7: 7, 30: 30, 90: 90 };

/** پیش‌فرضِ بازه وقتی مقدارِ آدرس ناشناس باشد. */
export const DEFAULT_PERIOD_DAYS = 30;

/**
 * نوارِ نگاه کلی: درآمدِ امروز / این ماهِ شمسی / امسالِ شمسی.
 *
 * 🔴 سقفِ «تا امروز» عمدی است. بدونِ آن، این سه عدد نوبت‌های **آینده** را هم می‌شمردند
 * در حالی که «درآمد خالصِ بازه» سقف دارد — نتیجه‌اش این بود که «این ماه» از «۳۰ روز اخیر»
 * بزرگ‌تر درمی‌آمد با اینکه بازه‌اش کوتاه‌تر است، و معلوم نبود کدام درست است.
 */
export function computeOverview(bookings, todayIso) {
  const tj = jalaliYM(todayIso);
  let incToday = 0, incMonth = 0, incYear = 0;
  for (const b of bookings) {
    if (b.date > todayIso) continue;
    const n = netOf(b);
    if (!n) continue;
    if (b.date === todayIso) incToday += n;
    const bj = jalaliYM(b.date);
    if (bj.y === tj.y) {
      incYear += n;
      if (bj.m === tj.m) incMonth += n;
    }
  }
  return { incToday, incMonth, incYear };
}

/**
 * جداکردنِ نوبت‌های داخلِ بازه‌ی انتخاب‌شده + تصمیمِ «نمودار روزانه باشد یا ماهانه».
 *
 * بازه‌های روزشمار سقفِ «تا امروز» دارند چون گزارشِ عملکردِ گذشته‌اند؛ «امسال» و «کل دوره»
 * تقویمی‌اند و نوبت‌های پیشِ رو را هم در بر می‌گیرند.
 */
export function filterByPeriod(bookings, period, todayIso) {
  if (period === 'all') return { filtered: bookings, chartMode: 'monthly' };
  if (period === 'year') {
    const tj = jalaliYM(todayIso);
    return { filtered: bookings.filter((b) => jalaliYM(b.date).y === tj.y), chartMode: 'monthly' };
  }
  const n = PERIOD_DAYS[period] || DEFAULT_PERIOD_DAYS;
  const start = shiftISO(todayIso, -(n - 1));
  return {
    filtered: bookings.filter((b) => b.date >= start && b.date <= todayIso),
    chartMode: n <= 31 ? 'daily' : 'monthly',
  };
}

/**
 * همه‌ی عددهای بازه، در یک پیمایش.
 *
 * 🔴 دو تفکیکِ ظریف که کلِ درستیِ این صفحه به آن‌ها بند است:
 *
 *  ۱) «لغوِ واقعی» در برابر «رهاشده در درگاه». وضعیتِ cancelled برای دو چیزِ کاملاً
 *     متفاوت نوشته می‌شود: نوبتی که کسی عمداً لغو کرده (cancelledBy پر است)، و رزروی که
 *     مشتری وسطِ درگاه رهایش کرده (cancelledBy خالی است). اگر با هم شمرده شوند، «نرخ لغو»
 *     در واقع «نرخ انصراف در درگاه» را نشان می‌دهد و صاحبِ کسب‌وکار نتیجه می‌گیرد
 *     مشتری‌هایش بدقول‌اند.
 *
 *  ۲) رزروی که مهلتِ نگه‌داشتش تمام شده، **همین حالا** رهاشده است — نه وقتی کرونِ دوساعته
 *     رسماً لغوش کند. بدونِ این، نرخِ لغو با اجرای کرون چند واحد می‌پرید بدونِ اینکه هیچ
 *     مشتری‌ای کاری کرده باشد. این همان تعریفی است که صفحه‌ی رزرو برای «آزادبودنِ ساعت»
 *     به کار می‌برد، پس دو جای اپ یک چیز را می‌گویند.
 *
 * @param {Array} filtered نوبت‌های داخلِ بازه
 * @param {number} now زمانِ مرجع بر حسبِ میلی‌ثانیه (برای تست قابلِ تزریق)
 */
export function computePeriodStats(filtered, now = Date.now()) {
  const staleBefore = new Date(now - PENDING_HOLD_MS);

  let net = 0, refunded = 0, paidCount = 0;
  let servedNet = 0, servedCount = 0, cancelledHeld = 0;
  let confirmed = 0, pend = 0, cancelledReal = 0, abandoned = 0;
  const perHour = {}, perService = {};

  for (const b of filtered) {
    const isCancelled = b.status === 'cancelled';

    if (b.status === 'confirmed') confirmed++;
    else if (b.status === 'pending') {
      if (b.paymentStatus === 'unpaid' && b.createdAt < staleBefore) abandoned++;
      else pend++;
    } else if (isCancelled) {
      // نوبتی که پولش گرفته شده ولی اسلاتش از دست رفته هم cancelledBy ندارد — ولی
      // مشتری‌اش پول داده و نباید در دسته‌ی «منصرف‌شده‌ها» بنشیند.
      if (b.cancelledBy || isReceived(b)) cancelledReal++;
      else abandoned++;
    }

    if (!isCancelled) perHour[b.timeSlot] = (perHour[b.timeSlot] || 0) + 1;

    if (isReceived(b)) {
      const n = netOf(b);
      net += n;
      paidCount++;
      refunded += b.refundAmount || 0;
      // پولی که برای نوبتی گرفته شده که در نهایت لغو شد و مسترد هم نشده: بخشی از درآمد
      // است ولی «درآمدِ خدمتِ ارائه‌شده» نیست. «در انتظار استرداد» هم نه ارائه شده و نه
      // قطعی است، پس در میانگینِ «هر نوبت» نمی‌آید — وگرنه میانگین را با پولی بالا می‌برد
      // که هنوز معلوم نیست مالِ آرایشگاه باشد.
      if (isCancelled || b.paymentStatus === 'refundPending') cancelledHeld += n;
      else {
        servedNet += n;
        servedCount++;
        // 🔴 فقط خدمتی که واقعاً ارائه شده به نامِ آن خدمت نوشته می‌شود. این کارت —
        // برخلافِ عددِ درآمدِ بالا — خطِ شفاف‌سازی ندارد، پس اگر پولِ نوبت‌های لغوشده هم
        // اینجا بنشیند، تصمیمِ «کدام خدمت را تبلیغ کنم» روی عددِ بیش‌برآوردشده گرفته می‌شود.
        perService[servicesLabelOf(b)] = (perService[servicesLabelOf(b)] || 0) + n;
      }
    }
  }

  const totalCount = filtered.length;
  // میانگین فقط روی نوبت‌هایی که واقعاً برگزار می‌شوند — مخرج و صورت هم‌جنس.
  const avg = servedCount ? Math.round(servedNet / servedCount) : 0;
  // مخرجِ نرخِ لغو هم فقط نوبت‌های واقعاً ثبت‌شده است (بدونِ تلاش‌های رهاشده‌ی درگاه).
  const bookedCount = totalCount - abandoned;
  const cancelRate = bookedCount ? Math.round((cancelledReal / bookedCount) * 100) : 0;

  return {
    net, refunded, paidCount,
    servedNet, servedCount, cancelledHeld,
    confirmed, pend, cancelledReal, abandoned,
    perHour, perService,
    totalCount, avg, bookedCount, cancelRate,
  };
}

/**
 * «طلبِ وصول‌نشده» — پولی که مشتری واقعاً به تو بدهکار است.
 *
 * 🔴 عمداً از **کلِ** داده شمرده می‌شود، نه از بازه: این یک «کارِ باز» است نه آمارِ دوره‌ای.
 * تنها منبعِ واقعی‌اش نوبتِ دستیِ «پول بعداً دریافت می‌شود» است که تاریخش تقریباً همیشه
 * آینده است، و بازه‌های روزشمار سقفِ «تا امروز» دارند.
 *
 * 🔴 فقط نوبتِ «تایید شده» — نه «در انتظار». رزروی که مشتری ساخته و همین الان داخلِ درگاه
 * است هم پرداخت‌نشده است، ولی کسی بدهکارش نیست: تا ۲۵ دقیقه‌ی دیگر یا پرداخت می‌شود یا
 * خودبه‌خود لغو. شمردنش یعنی عددِ «طلب» بی‌دلیل بالا و پایین برود.
 */
export function computeOutstanding(bookings) {
  const items = bookings.filter((b) => b.status === 'confirmed' && b.paymentStatus === 'unpaid');
  return { count: items.length, amount: items.reduce((s, b) => s + b.amount, 0) };
}

/**
 * ستون‌های نمودارِ درآمد به تفکیکِ ماهِ شمسی.
 *
 * اگر بازه بیش از یک سالِ شمسی را بپوشانَد، دو رقمِ سال هم روی برچسب می‌آید — وگرنه دو
 * ستونِ «فروردین» از دو سالِ مختلف کاملاً شبیهِ هم می‌شوند و نمودار خوانده نمی‌شود.
 * در بازه‌ی تک‌سال، سال تکراری است و فقط محور را شلوغ می‌کند.
 *
 * @param {(s:string|number)=>string} toDigits تبدیلِ ارقام به فارسی (تزریقی تا این فایل به نمایش وابسته نشود)
 * @param {string[]} monthNames نامِ ماه‌ها به ترتیب
 */
export function buildMonthlyChart(filtered, monthNames, toDigits) {
  const byMonth = {};
  for (const b of filtered) {
    const v = netOf(b);
    if (!v) continue;
    const { y, m } = jalaliYM(b.date);
    const key = `${y}-${String(m).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + v;
  }
  const entries = Object.entries(byMonth).sort(([a], [b]) => (a < b ? -1 : 1));
  const multiYear = new Set(entries.map(([k]) => k.split('-')[0])).size > 1;
  return entries.map(([key, value]) => {
    const [y, m] = key.split('-');
    const name = monthNames[parseInt(m, 10) - 1];
    return {
      label: multiYear ? `${name} ${toDigits(y.slice(-2))}` : name,
      net: value,
      full: `${name} ${toDigits(y)}`,
    };
  });
}

/**
 * ستون‌های نمودارِ درآمدِ روزانه — هر روزِ بازه یک ستون دارد، حتی اگر درآمدش صفر باشد،
 * تا شکافِ بینِ روزها در نمودار دیده شود نه اینکه روزهای خالی حذف شوند.
 */
export function buildDailyChart(filtered, period, todayIso, formatLabel, formatFull) {
  const n = PERIOD_DAYS[period] || DEFAULT_PERIOD_DAYS;
  const byDay = {};
  for (const b of filtered) {
    const v = netOf(b);
    if (v) byDay[b.date] = (byDay[b.date] || 0) + v;
  }
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const iso = shiftISO(todayIso, -i);
    out.push({ label: formatLabel(iso), net: byDay[iso] || 0, full: formatFull(iso) });
  }
  return out;
}
