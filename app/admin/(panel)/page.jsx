import { prisma } from '@/lib/db';
import { TrendingUp, Hourglass, Receipt, Clock, Scissors, XCircle, PieChart } from 'lucide-react';
import { formatPrice, toPersianDigits, formatJalaliDate, PERSIAN_MONTHS } from '@/lib/persian';
import { TIME_SLOTS, STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
// 🧮 همه‌ی ریاضیاتِ این صفحه در یک فایلِ جداست تا قابلِ تست باشد (tests/dashboard-stats.test.js).
// این صفحه فقط داده را می‌گیرد، آن توابع را صدا می‌زند و نتیجه را می‌چیند — خودش حساب نمی‌کند.
import {
  netOf, computeOverview, filterByPeriod, computePeriodStats,
  computeOutstanding, buildMonthlyChart, buildDailyChart,
} from '@/lib/dashboard-stats';
// ⚠️ «امروزِ ایران» و جابه‌جاییِ روز عمداً از یک منبعِ مشترک می‌آیند. قبلاً همین دو تابع
// اینجا دوباره نوشته شده بودند؛ اگر روزی یکی اصلاح می‌شد و دیگری نه، داشبورد و لیستِ
// نوبت‌ها روی دو «امروز» متفاوت حساب می‌کردند و کشفش تقریباً ناممکن بود.
import { tehranTodayISO, shiftISO } from '@/lib/time';
import DashboardPeriod from '@/features/admin/DashboardPeriod';
import RevenueChart from '@/features/admin/RevenueChart';
import PeakHoursChart from '@/features/admin/PeakHoursChart';
import StatusDonut from '@/features/admin/StatusDonut';

export const dynamic = 'force-dynamic';

const PERIOD_LABELS = { today: 'امروز', 7: '۷ روز اخیر', 30: '۳۰ روز اخیر', 90: '۹۰ روز اخیر', year: 'امسال', all: 'کل دوره' };

export default async function AdminDashboard({ searchParams }) {
  const sp = (await searchParams) || {};
  // مقدارِ ناشناس در آدرس (مثلاً ‎?period=xyz‎) به پیش‌فرض برمی‌گردد. بدونِ این، محاسبات
  // بی‌خطر روی ۳۰ روز می‌افتادند ولی سرتیترِ بازه خالی می‌مانْد و هیچ دکمه‌ای هم فعال نبود.
  const period = PERIOD_LABELS[sp.period] ? sp.period : '30';

  // «امروز» به وقتِ ایران — مبنای همه‌ی محاسبات و بازه‌ها. باید پیش از کوئری ساخته شود،
  // چون خودِ کوئری هم برای محدودکردنِ بازه از آن استفاده می‌کند.
  const todayIso = tehranTodayISO();

  // فقط ستون‌های موردنیازِ محاسبات (نه کلِ رکورد + دو join). servicesLabel اسنپ‌شاتِ نامِ
  // خدمات است، پس برای درآمدِ هر خدمت به include نیازی نیست.
  //
  // ⚡ محدوده‌ی خواندن: برای همه‌ی بازه‌ها جز «کل دوره» فقط ۴۰۰ روزِ گذشته خوانده می‌شود.
  // چرا ۴۰۰؟ چون بزرگ‌ترین بازه‌ی محاسباتی «امسالِ شمسی» است (حداکثر ۳۶۶ روز) و بازه‌های
  // روزشمار هم حداکثر ۹۰ روزند؛ ۴۰۰ روز با حاشیه هر دو را می‌پوشاند. بدونِ این قید، هر
  // بازکردنِ داشبورد کلِ جدولِ نوبت‌ها را اسکن می‌کرد و با گذشتِ سال‌ها کندتر می‌شد.
  const all = await prisma.booking.findMany({
    where: period === 'all' ? undefined : { date: { gte: shiftISO(todayIso, -400) } },
    select: {
      date: true, timeSlot: true, status: true, cancelledBy: true, createdAt: true,
      paymentStatus: true, amount: true, refundAmount: true, servicesLabel: true,
    },
    orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
  });

  // ── همه‌ی ریاضیات در یک جا (src/lib/dashboard-stats.js) ──
  // این صفحه خودش حساب نمی‌کند؛ فقط داده را می‌دهد و نتیجه را می‌چیند. دلیلش تست‌پذیری
  // است: این عددها مبنای تصمیم‌های مالیِ صاحبِ کسب‌وکارند و باید تستِ خودکار داشته باشند.
  const { incToday, incMonth, incYear } = computeOverview(all, todayIso);
  const { filtered, chartMode } = filterByPeriod(all, period, todayIso);
  const {
    net, refunded, paidCount, servedCount, cancelledHeld,
    confirmed, pend, cancelledReal, abandoned,
    perHour, perService, totalCount, avg, bookedCount, cancelRate,
  } = computePeriodStats(filtered);
  const { amount: pending } = computeOutstanding(all);

  // 🔴 «نیازِ پیگیری» عمداً از کلِ داده شمرده می‌شود، نه از بازه‌ی انتخاب‌شده.
  // این یک «کارِ باز» است نه یک آمارِ دوره‌ای: نوبتِ گیرافتاده‌ی ماهِ پیش یا نوبتِ فردا هم
  // باید دیده شود. با شمارشِ درون‌بازه‌ای، عوض‌کردنِ بازه عددِ هشدار را بی‌دلیل صفر می‌کرد.
  // ⚠️ با کوئریِ جداگانه، نه از روی `all` — چون `all` به ۴۰۰ روزِ اخیر محدود است و متنِ
  // خودِ بنر وعده می‌دهد «کلِ نوبت‌ها را می‌بیند». بدونِ این، یک نوبتِ گیرافتاده‌ی قدیمی‌تر
  // فقط با انتخابِ بازه‌ی «کل دوره» ظاهر می‌شد — یعنی همان جمله خودش را نقض می‌کرد.
  const refundPendingStats = await prisma.booking.aggregate({
    where: { paymentStatus: 'refundPending' },
    _count: true,
    _sum: { amount: true },
  });
  const refundPendingCount = refundPendingStats._count;
  const refundPendingAmount = refundPendingStats._sum.amount || 0;

  // ── داده‌ی نمودار درآمد ──
  const chart = chartMode === 'daily'
    ? buildDailyChart(
        filtered, period, todayIso,
        (iso) => toPersianDigits(formatJalaliDate(iso, { day: 'numeric' })),
        (iso) => formatJalaliDate(iso, { weekday: 'long', day: 'numeric', month: 'long' }),
      )
    : buildMonthlyChart(filtered, PERSIAN_MONTHS, toPersianDigits);
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
            {/* «دریافت‌شده» نه «موفق»: این شمارنده نوبت‌های مستردشده و در انتظار استرداد را
                هم شامل می‌شود، پس با فیلترِ «پرداخت‌شده»ی لیستِ نوبت‌ها یکی نیست. */}
            <p className="text-[11px] text-zinc-500 mt-1.5">درآمد خالصِ این بازه · {toPersianDigits(paidCount)} پرداختِ دریافت‌شده</p>
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
          <>
            <RevenueChart data={chart} />
            {/* در نمای ماهانه، بازه معمولاً وسطِ یک ماهِ شمسی شروع و تمام می‌شود. بدونِ این
                توضیح، ستونِ کوتاهِ اول و آخر شبیهِ «ماهِ ضعیف» دیده می‌شوند نه «ماهِ ناقص». */}
            {chartMode === 'monthly' && (
              <p className="text-[11px] text-zinc-500 text-center mt-3">
                ماهِ اول و آخرِ بازه ممکن است ناقص باشند و کوتاه‌تر دیده شوند.
              </p>
            )}
          </>
        )}
      </div>

      {/* KPIهای بازه */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Receipt} label="تعداد نوبت" value={toPersianDigits(totalCount)} sub={`${toPersianDigits(paidCount)} پرداختِ دریافت‌شده`} />
        <Kpi icon={TrendingUp} tone="amber" label="میانگین هر نوبت" value={formatPrice(avg)} sub={`${toPersianDigits(servedCount)} نوبتِ برگزارشده`} />
        {/* زیرنویس همیشه همان چیزی را توضیح می‌دهد که عددِ بالایش است. قبلاً به‌محضِ وجودِ یک
            استرداد، جایش را به مبلغِ مسترد می‌داد و دو عددِ بی‌ربط کنارِ هم می‌نشستند. */}
        <Kpi icon={Hourglass} tone="sky" label="در انتظار پرداخت" value={formatPrice(pending)} sub="طلبِ وصول‌نشده · مستقل از بازه" />
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
          <p className="text-[11px] text-zinc-500 -mt-2 mb-3">فقط نوبت‌هایی که واقعاً برگزار شده‌اند — پولِ نوبت‌های لغوشده اینجا شمرده نمی‌شود.</p>
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
            {/* حالتِ خالی، مثلِ سه کارتِ دیگرِ همین صفحه. بدونِ آن، یک حلقه‌ی خاکستری با
                چهار ردیفِ «۰ · ۰٪» رندر می‌شد که شبیهِ خرابی است نه «داده‌ای نیست». */}
            {totalCount === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">در این بازه نوبتی ثبت نشده است.</p>
            ) : (
              <StatusDonut segments={statusSegments} total={totalCount} />
            )}
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

