import { prisma } from '@/lib/db';
import { TrendingUp, Hourglass, Receipt, Clock, Scissors, XCircle, PieChart } from 'lucide-react';
import { formatPrice, toPersianDigits, formatJalaliDate } from '@/lib/persian';
import { servicesLabelOf } from '@/lib/serializers';
import { TIME_SLOTS } from '@/lib/constants';
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
const netOf = (b) => (b.paymentStatus === 'paid' || b.paymentStatus === 'refunded' ? b.amount - (b.refundAmount || 0) : 0);

export default async function AdminDashboard({ searchParams }) {
  const sp = (await searchParams) || {};
  const period = sp.period || '30';

  // فقط ستون‌های موردنیازِ محاسبات (نه کلِ رکورد + دو join). servicesLabel اسنپ‌شاتِ نامِ
  // خدمات است، پس برای درآمدِ هر خدمت به include نیازی نیست.
  const all = await prisma.booking.findMany({
    select: {
      date: true, timeSlot: true, status: true,
      paymentStatus: true, amount: true, refundAmount: true, servicesLabel: true,
    },
    orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
  });

  const todayIso = tehranTodayIso();
  const tj = jalaliYM(todayIso);

  // ── نوارِ نگاه کلی (همیشه از کلِ داده) ──
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
  let net = 0, refunded = 0, pending = 0, paidCount = 0, confirmed = 0, pend = 0, cancelled = 0;
  const perHour = {}, perService = {};
  for (const b of filtered) {
    if (b.status === 'confirmed') confirmed++;
    else if (b.status === 'pending') pend++;
    else if (b.status === 'cancelled') cancelled++;

    if (b.status !== 'cancelled') perHour[b.timeSlot] = (perHour[b.timeSlot] || 0) + 1;

    const n = netOf(b);
    if (b.paymentStatus === 'paid' || b.paymentStatus === 'refunded') {
      net += n; paidCount++;
      refunded += b.refundAmount || 0;
      perService[servicesLabelOf(b)] = (perService[servicesLabelOf(b)] || 0) + n;
    } else if (b.paymentStatus === 'unpaid' && b.status !== 'cancelled') {
      pending += b.amount;
    }
  }
  const totalCount = filtered.length;
  const avg = paidCount ? Math.round(net / paidCount) : 0;
  const cancelRate = totalCount ? Math.round((cancelled / totalCount) * 100) : 0;

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
  const hoursData = TIME_SLOTS.map((t) => ({
    label: toPersianDigits(t.slice(0, 2)),
    value: perHour[t] || 0,
    full: toPersianDigits(t),
  }));
  const hoursTotal = TIME_SLOTS.reduce((s, t) => s + (perHour[t] || 0), 0);

  // داده‌ی نمودارِ دوناتِ وضعیت.
  const statusSegments = [
    { label: 'تایید شده', value: confirmed, color: '#34d399' },
    { label: 'در انتظار', value: pend, color: '#fbbf24' },
    { label: 'لغو شده', value: cancelled, color: '#fb7185' },
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
        <Kpi icon={TrendingUp} tone="amber" label="میانگین هر نوبت" value={formatPrice(avg)} sub="به‌ازای هر پرداخت" />
        <Kpi icon={Hourglass} tone="sky" label="در انتظار پرداخت" value={formatPrice(pending)} sub={refunded ? `${formatPrice(refunded)} مسترد` : 'طلبِ وصول‌نشده'} />
        <Kpi icon={XCircle} tone="rose" label="نرخ لغو" value={`${toPersianDigits(cancelRate)}٪`} sub={`${toPersianDigits(cancelled)} لغو از ${toPersianDigits(totalCount)}`} />
      </div>

      {/* نمودارِ ستونیِ شلوغیِ ساعت‌ها (تمام‌عرض) */}
      <div className="glass rounded-2xl p-5 md:p-6">
        <SectionTitle icon={Clock} title="شلوغیِ ساعت‌ها" note={`${toPersianDigits(hoursTotal)} نوبت در این بازه`} />
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
          <SectionTitle icon={Scissors} title="درآمد به تفکیک خدمت" note={services.length ? `${toPersianDigits(services.length)} خدمت` : null} />
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

