import { prisma } from '@/lib/db';
import { TrendingUp, Hourglass, Receipt, Clock, Scissors, XCircle, PieChart } from 'lucide-react';
import { formatPrice, toPersianDigits, formatJalaliDate } from '@/lib/persian';
import { servicesLabelOf } from '@/lib/serializers';
import { TIME_SLOTS, STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import DashboardPeriod from '@/features/admin/DashboardPeriod';
import RevenueChart from '@/features/admin/RevenueChart';
import PeakHoursChart from '@/features/admin/PeakHoursChart';
import StatusDonut from '@/features/admin/StatusDonut';

export const dynamic = 'force-dynamic';

const PERSIAN_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const PERIOD_LABELS = { today: 'امروز', 7: '۷ روز اخیر', 30: '۳۰ روز اخیر', 90: '۹۰ روز اخیر', year: 'امسال', all: 'کل دوره' };

// تاریخِ «امروز» به وقت ایران (مستقل از تایم‌زون سرور).
function tehranTodayIso() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
// جابه‌جاییِ امنِ روز روی رشته‌ی ISO (بدون دردسر تایم‌زون).
function shiftIso(iso, delta) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}
// فرمترِ شمسی یک‌بار ساخته می‌شود (ساختِ Intl.DateTimeFormat گران است) و بین همه‌ی
// رکوردها بازاستفاده می‌شود؛ به‌علاوه نتیجه‌ی هر تاریخ در یک Map کش می‌شود تا برای
// رکوردهای هم‌تاریخ دوباره محاسبه نشود. (قبلاً برای هر رکورد یک فرمترِ جدید ساخته می‌شد.)
const PERSIAN_YM_FMT = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric' });
const _ymCache = new Map();
// سال و ماهِ شمسیِ یک تاریخِ ISO میلادی (اعداد لاتین).
function jalaliYM(iso) {
  const hit = _ymCache.get(iso);
  if (hit) return hit;
  const p = PERSIAN_YM_FMT.formatToParts(new Date(iso + 'T00:00:00'));
  const val = { y: p.find((x) => x.type === 'year')?.value, m: parseInt(p.find((x) => x.type === 'month')?.value, 10) };
  _ymCache.set(iso, val);
  return val;
}
// آیا پولِ این نوبت واقعاً دریافت شده؟ «در انتظار استرداد» هم پولش دریافت شده و هنوز
// برنگشته، پس باید دیده شود — قبلاً از همه‌ی محاسبات بیرون می‌افتاد و یک نوبتِ پرداخت‌شده
// در هیچ‌کدام از عددهای داشبورد (نه درآمد، نه طلب، نه مسترد) شمرده نمی‌شد.
const isReceived = (b) =>
  b.paymentStatus === 'paid' || b.paymentStatus === 'refunded' || b.paymentStatus === 'refundPending';
const netOf = (b) => (isReceived(b) ? b.amount - (b.refundAmount || 0) : 0);

export default async function AdminDashboard({ searchParams }) {
  const sp = (await searchParams) || {};
  const period = sp.period || '30';

  // «امروز» به وقتِ ایران — مبنای همه‌ی محاسبات و بازه‌ها. باید پیش از کوئری ساخته شود،
  // چون خودِ کوئری هم برای محدودکردنِ بازه از آن استفاده می‌کند.
  const todayIso = tehranTodayIso();

  // فقط ستون‌های موردنیازِ محاسبات (نه کلِ رکورد + دو join). servicesLabel اسنپ‌شاتِ نامِ
  // خدمات است، پس برای درآمدِ هر خدمت به include نیازی نیست.
  //
  // ⚡ محدوده‌ی خواندن: برای همه‌ی بازه‌ها جز «کل دوره» فقط ۴۰۰ روزِ گذشته خوانده می‌شود.
  // چرا ۴۰۰؟ چون بزرگ‌ترین بازه‌ی محاسباتی «امسالِ شمسی» است (حداکثر ۳۶۶ روز) و بازه‌های
  // روزشمار هم حداکثر ۹۰ روزند؛ ۴۰۰ روز با حاشیه هر دو را می‌پوشاند. بدونِ این قید، هر
  // بازکردنِ داشبورد کلِ جدولِ نوبت‌ها را اسکن می‌کرد و با گذشتِ سال‌ها کندتر می‌شد.
  const all = await prisma.booking.findMany({
    where: period === 'all' ? undefined : { date: { gte: shiftIso(todayIso, -400) } },
    select: {
      date: true, timeSlot: true, status: true, cancelledBy: true,
      paymentStatus: true, amount: true, refundAmount: true, servicesLabel: true,
    },
    orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
  });

  const tj = jalaliYM(todayIso);

  // ── نوارِ نگاه کلی ──
  // از کلِ دادهٔ خوانده‌شده (۴۰۰ روزِ اخیر) که سالِ شمسیِ جاری را کامل می‌پوشاند.
  // ⚠️ اگر روزی بازه‌ی بزرگ‌تری (مثلاً «دو سالِ اخیر») اضافه شد، قیدِ ۴۰۰ روزِ کوئری هم باید بزرگ شود.
  let incToday = 0, incMonth = 0, incYear = 0;
  for (const b of all) {
    const n = netOf(b);
    if (!n) continue;
    if (b.date === todayIso) incToday += n;
    const bj = jalaliYM(b.date);
    if (bj.y === tj.y) { incYear += n; if (bj.m === tj.m) incMonth += n; }
  }

  // ── فیلترِ بازه ──
  let filtered, chartMode;
  if (period === 'all') { filtered = all; chartMode = 'monthly'; }
  else if (period === 'year') { filtered = all.filter((b) => jalaliYM(b.date).y === tj.y); chartMode = 'monthly'; }
  else {
    const n = { today: 1, 7: 7, 30: 30, 90: 90 }[period] || 30;
    const start = shiftIso(todayIso, -(n - 1));
    filtered = all.filter((b) => b.date >= start && b.date <= todayIso);
    chartMode = n <= 31 ? 'daily' : 'monthly';
  }

  // ── محاسبات بازه ──
  //
  // 🔴 تفکیکِ «لغوِ واقعی» از «پرداختِ رهاشده» — مهم‌ترین اصلاحِ این صفحه.
  // وضعیتِ cancelled در دیتابیس برای دو چیزِ کاملاً متفاوت نوشته می‌شود:
  //   • مشتری یا مدیریت نوبتِ ثبت‌شده‌ای را لغو کرده  ⇒ cancelledBy پر است
  //   • مشتری وارد درگاه شده و بدونِ پرداخت برگشته   ⇒ cancelledBy خالی است
  // قبلاً هر دو با هم «لغو» شمرده می‌شدند، پس «نرخ لغو» در واقع «نرخ انصراف در درگاه» را
  // نشان می‌داد و صاحبِ کسب‌وکار نتیجه می‌گرفت مشتری‌هایش بدقول‌اند.
  let net = 0, refunded = 0, pending = 0, paidCount = 0;
  let servedNet = 0, servedCount = 0, cancelledHeld = 0;
  let confirmed = 0, pend = 0, cancelledReal = 0, abandoned = 0;
  const perHour = {}, perService = {};
  for (const b of filtered) {
    const isCancelled = b.status === 'cancelled';
    if (b.status === 'confirmed') confirmed++;
    else if (b.status === 'pending') pend++;
    // «رهاشده در درگاه» فقط وقتی است که پولی هم دریافت نشده باشد. نوبتی که پولش گرفته شده
    // ولی اسلاتش از دست رفته هم cancelledBy ندارد — ولی مشتری‌اش پول داده و نباید در
    // دسته‌ی «منصرف‌شده‌ها» بنشیند.
    else if (isCancelled) { if (b.cancelledBy || isReceived(b)) cancelledReal++; else abandoned++; }

    if (!isCancelled) perHour[b.timeSlot] = (perHour[b.timeSlot] || 0) + 1;

    const n = netOf(b);
    if (isReceived(b)) {
      net += n; paidCount++;
      refunded += b.refundAmount || 0;
      perService[servicesLabelOf(b)] = (perService[servicesLabelOf(b)] || 0) + n;
      // پولی که برای نوبتی گرفته شده که در نهایت لغو شد و مسترد هم نشده: بخشی از درآمد است
      // ولی «درآمدِ خدمتِ ارائه‌شده» نیست؛ جدا نشان داده می‌شود تا با بقیه قاطی نشود.
      // «در انتظار استرداد» نه درآمدِ خدمتِ ارائه‌شده است و نه قطعی — پولش گرفته شده ولی
      // تکلیفش روشن نیست (یا اسلات رفته، یا مبلغ نخوانده). پس در میانگینِ «هر نوبت» نمی‌آید،
      // وگرنه میانگین را با پولی بالا می‌برد که هنوز معلوم نیست مالِ آرایشگاه باشد.
      if (isCancelled || b.paymentStatus === 'refundPending') cancelledHeld += n;
      else { servedNet += n; servedCount++; }
    } else if (b.paymentStatus === 'unpaid' && !isCancelled) {
      pending += b.amount;
    }
  }
  // 🔴 «نیازِ پیگیری» عمداً از کلِ داده شمرده می‌شود، نه از بازه‌ی انتخاب‌شده.
  // این یک «کارِ باز» است نه یک آمارِ دوره‌ای: نوبتِ گیرافتاده‌ی ماهِ پیش یا نوبتِ فردا هم
  // باید دیده شود. با شمارشِ درون‌بازه‌ای، عوض‌کردنِ بازه عددِ هشدار را بی‌دلیل صفر می‌کرد.
  const refundPendingItems = all.filter((b) => b.paymentStatus === 'refundPending');
  const refundPendingCount = refundPendingItems.length;
  const refundPendingAmount = refundPendingItems.reduce((s, b) => s + b.amount, 0);

  const totalCount = filtered.length;
  // میانگین فقط روی نوبت‌هایی که واقعاً برگزار می‌شوند — مخرج و صورت هم‌جنس.
  // قبلاً نوبتِ کاملاً مستردشده در مخرج بود ولی مبلغش در صورت نبود، پس میانگین پایین‌تر از
  // هر قیمتِ واقعی می‌افتاد.
  const avg = servedCount ? Math.round(servedNet / servedCount) : 0;
  // مخرجِ نرخِ لغو هم فقط نوبت‌های واقعاً ثبت‌شده است (بدونِ تلاش‌های رهاشده‌ی درگاه).
  const bookedCount = totalCount - abandoned;
  const cancelRate = bookedCount ? Math.round((cancelledReal / bookedCount) * 100) : 0;

  // ── داده‌ی نمودار درآمد ──
  let chart = [];
  if (chartMode === 'daily') {
    const n = { today: 1, 7: 7, 30: 30 }[period] || 30;
    const byDay = {};
    for (const b of filtered) { const v = netOf(b); if (v) byDay[b.date] = (byDay[b.date] || 0) + v; }
    for (let i = n - 1; i >= 0; i--) {
      const iso = shiftIso(todayIso, -i);
      chart.push({ label: toPersianDigits(formatJalaliDate(iso, { day: 'numeric' })), net: byDay[iso] || 0, full: formatJalaliDate(iso, { weekday: 'long', day: 'numeric', month: 'long' }) });
    }
  } else {
    const byMonth = {};
    for (const b of filtered) { const v = netOf(b); if (!v) continue; const { y, m } = jalaliYM(b.date); const k = `${y}-${String(m).padStart(2, '0')}`; byMonth[k] = (byMonth[k] || 0) + v; }
    chart = Object.entries(byMonth).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => {
      const [y, m] = k.split('-');
      return { label: PERSIAN_MONTHS[parseInt(m, 10) - 1], net: v, full: `${PERSIAN_MONTHS[parseInt(m, 10) - 1]} ${toPersianDigits(y)}` };
    });
  }
  const emptyChart = chart.every((c) => c.net === 0);

  // ── متریک‌های دقیق ──
  const services = Object.entries(perService).sort(([, a], [, b]) => b - a);
  const maxService = Math.max(1, ...services.map(([, v]) => v));

  // داده‌ی نمودارِ شلوغیِ ساعت‌ها (ستونی).
  // برچسب کاملِ ساعت است، نه دو رقمِ اول: اسلات‌ها گامِ ۷۵ دقیقه‌ای دارند، پس بریدنِ دقیقه
  // باعث می‌شد ستونِ ۱۰:۱۵ زیرِ برچسبِ «۱۰» بنشیند و ساعتِ شلوغ اشتباه خوانده شود — و
  // نبودِ «۱۳» و «۱۸» روی محور شبیهِ حفره‌ی داده به‌نظر می‌رسید.
  const hoursData = TIME_SLOTS.map((t) => ({
    label: toPersianDigits(t),
    value: perHour[t] || 0,
    full: toPersianDigits(t),
  }));
  const hoursTotal = TIME_SLOTS.reduce((s, t) => s + (perHour[t] || 0), 0);

  // داده‌ی نمودارِ دوناتِ وضعیت — «رهاشده در درگاه» سهمِ خودش را دارد و در «لغو شده» قاطی نمی‌شود.
  // برچسب‌ها از همان منبعی می‌آیند که بَجِ هر ردیف، تا یک وضعیت در دو صفحه دو اسم نداشته باشد.
  const statusSegments = [
    { label: STATUS_LABELS.confirmed, value: confirmed, color: '#34d399' },
    { label: STATUS_LABELS.pending, value: pend, color: '#fbbf24' },
    { label: STATUS_LABELS.cancelled, value: cancelledReal, color: '#fb7185' },
    { label: 'رهاشده در درگاه', value: abandoned, color: '#71717a' },
  ];

  return (
    <div className="space-y-6">
      {/* سرصفحه + انتخابگر بازه */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.2em] text-amber-500/80">پنل مدیریت</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1.5">داشبورد</h1>
        </div>
        <DashboardPeriod value={period} />
      </div>

      {/* هشدارِ اقدامِ لازم: پولی گرفته شده ولی نوبتش قطعی نشده. این حالت نادر است (اسلات در
          فاصله‌ی پرداخت پر شده، یا ثبتِ نهایی شکست خورده) ولی اگر دیده نشود، پولِ مشتری
          بی‌صاحب می‌مانَد و آرایشگاه خبردار نمی‌شود. */}
      {refundPendingCount > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300 text-xs leading-relaxed">
          <span className="font-extrabold">نیازِ پیگیری: </span>
          {toPersianDigits(refundPendingCount)} نوبت با مجموعِ {formatPrice(refundPendingAmount)} در حالتِ «در انتظار استرداد» است —
          پول گرفته شده ولی نوبت قطعی نشده. در تبِ «نوبت‌ها ← لیست نوبت‌ها»، فیلترِ تاریخ را روی
          <b> «همه (با گذشته)»</b> و فیلترِ پرداخت را روی <b>«در انتظار استرداد»</b> بگذار و تعیین تکلیف کن.
          <span className="block opacity-80 mt-1">(این شمارش مستقل از بازه‌ی انتخاب‌شده است و کلِ نوبت‌ها را می‌بیند.)</span>
        </div>
      )}

      {/* درآمدِ همیشگی: امروز / این ماه / امسال */}
      <div className="grid grid-cols-3 gap-3">
        <Glance label="امروز" value={incToday} />
        <Glance label="این ماه" value={incMonth} />
        <Glance label="امسال" value={incYear} />
      </div>

      {/* پنلِ اصلی: روند درآمدِ بازه (امضای صفحه) */}
      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-zinc-500">روند درآمد · {PERIOD_LABELS[period]}</p>
            <p className="text-3xl md:text-4xl font-extrabold text-emerald-400 mt-2 tabular-nums">{formatPrice(net)}</p>
            <p className="text-[11px] text-zinc-500 mt-1.5">درآمد خالصِ این بازه · {toPersianDigits(paidCount)} پرداختِ موفق</p>
            {/* شفاف‌سازی: چه مقدار از همین عدد مالِ نوبت‌هایی است که لغو شدند و پولشان
                برنگشته. بدونِ این خط، آن مبلغ بی‌صدا داخلِ «درآمد» می‌نشست. */}
            {cancelledHeld > 0 && (
              <p className="text-[11px] text-amber-500/90 mt-1">
                شامل {formatPrice(cancelledHeld)} از نوبت‌های لغوشده که مسترد نشده — تسویه‌ی آن با توست.
              </p>
            )}
            {refunded > 0 && (
              <p className="text-[11px] text-sky-400/90 mt-1">
                {formatPrice(refunded)} در این بازه به مشتری‌ها مسترد شده (از عددِ بالا کسر شده است).
              </p>
            )}
          </div>
          <span className="shrink-0 text-[10px] text-zinc-400 border border-white/10 rounded-full px-3 py-1">{chartMode === 'daily' ? 'روزانه' : 'ماهانه'}</span>
        </div>
        {emptyChart ? (
          <p className="text-xs text-zinc-500 text-center py-14">در این بازه درآمدی ثبت نشده است.</p>
        ) : (
          <RevenueChart data={chart} />
        )}
      </div>

      {/* KPIهای بازه */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Receipt} label="تعداد نوبت" value={toPersianDigits(totalCount)} sub={`${toPersianDigits(paidCount)} پرداخت‌شده`} />
        <Kpi icon={TrendingUp} tone="amber" label="میانگین هر نوبت" value={formatPrice(avg)} sub={`${toPersianDigits(servedCount)} نوبتِ برگزارشده`} />
        {/* زیرنویس همیشه همان چیزی را توضیح می‌دهد که عددِ بالایش است. قبلاً به‌محضِ وجودِ یک
            استرداد، جایش را به مبلغِ مسترد می‌داد و دو عددِ بی‌ربط کنارِ هم می‌نشستند. */}
        <Kpi icon={Hourglass} tone="sky" label="در انتظار پرداخت" value={formatPrice(pending)} sub="طلبِ وصول‌نشده" />
        <Kpi
          icon={XCircle}
          tone="rose"
          label="نرخ لغو"
          value={`${toPersianDigits(cancelRate)}٪`}
          sub={`${toPersianDigits(cancelledReal)} لغو از ${toPersianDigits(bookedCount)} نوبت`}
        />
      </div>

      {/* نمودارِ ستونیِ شلوغیِ ساعت‌ها (تمام‌عرض) */}
      <div className="glass rounded-2xl p-5 md:p-6">
        {/* عدد این بخش با KPIِ «تعداد نوبت» یکی نیست و نباید باشد: اینجا فقط نوبت‌های فعال
            شمرده می‌شوند. برچسب صریح شد تا اختلافِ دو عدد سؤال نسازد. */}
        <SectionTitle icon={Clock} title="شلوغیِ ساعت‌ها" note={`${toPersianDigits(hoursTotal)} نوبتِ فعال (بدونِ لغوشده‌ها)`} />
        <div className="mt-5">
          {hoursTotal === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-14">در این بازه نوبتی ثبت نشده است.</p>
          ) : (
            <PeakHoursChart data={hoursData} />
          )}
        </div>
      </div>

      {/* دو ستون: درآمدِ خدمات + دوناتِ وضعیت */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          {/* «ترکیب» نه «خدمت»: کلیدِ گروه‌بندی برچسبِ کاملِ نوبت است، پس نوبتِ دو-خدمتی یک
              سطرِ سومِ جدا («الف + ب») می‌سازد. با عنوانِ قبلی، شمارنده از تعدادِ خدماتِ
              واقعیِ آرایشگاه بیشتر می‌شد و عددش دروغ بود. */}
          <SectionTitle icon={Scissors} title="درآمد به تفکیکِ ترکیبِ خدمات" note={services.length ? `${toPersianDigits(services.length)} ترکیب` : null} />
          {services.length === 0 ? (
            <p className="text-xs text-zinc-500 py-10 text-center">داده‌ای برای نمایش نیست.</p>
          ) : (
            <div className="space-y-3.5 mt-5">
              {services.map(([name, v]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-semibold">{name}</span>
                    <span className="text-emerald-400 font-extrabold tabular-nums">{formatPrice(v)}</span>
                  </div>
                  <Bar pct={Math.round((v / maxService) * 100)} tone="emerald" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <SectionTitle icon={PieChart} title="ترکیب وضعیت نوبت‌ها" note={`${toPersianDigits(totalCount)} کل`} />
          <div className="mt-6">
            <StatusDonut segments={statusSegments} total={totalCount} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Glance({ label, value }) {
  return (
    <div className="glass rounded-2xl px-4 py-3.5">
      <p className="text-[11px] text-zinc-500 font-bold">درآمد {label}</p>
      <p className="text-base md:text-lg font-extrabold text-emerald-400 mt-1.5 tabular-nums">{formatPrice(value)}</p>
    </div>
  );
}

function Kpi({ icon: Icon, tone, label, value, sub }) {
  const tones = { amber: 'text-amber-400', sky: 'text-sky-300', rose: 'text-rose-400' };
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-500 font-bold">{label}</span>
        <Icon className="w-3.5 h-3.5 text-zinc-600" />
      </div>
      <p className={cn('text-xl font-extrabold mt-2 tabular-nums', tones[tone] || 'text-zinc-100')}>{value}</p>
      <p className="text-[10px] text-zinc-500 mt-1">{sub}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, note }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-bold text-zinc-200">{title}</span>
      </div>
      {note && <span className="text-[10px] text-zinc-500">{note}</span>}
    </div>
  );
}

function Bar({ pct, tone = 'amber' }) {
  return (
    <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
      <div
        className={cn('h-full rounded-full bg-gradient-to-l', tone === 'emerald' ? 'from-emerald-500 to-emerald-600' : 'from-amber-500 to-amber-600')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

