import { prisma } from '@/lib/db';
import { Wallet, CalendarDays, CalendarRange, TrendingUp, Coins, Clock, Scissors, Hourglass, Receipt } from 'lucide-react';
import { formatPrice, toPersianDigits, formatJalaliDate } from '@/lib/persian';
import { servicesLabelOf } from '@/lib/serializers';
import { TIME_SLOTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import DashboardPeriod from '@/features/admin/DashboardPeriod';

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
// سال و ماهِ شمسیِ یک تاریخِ ISO میلادی (اعداد لاتین).
function jalaliYM(iso) {
  const p = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric' }).formatToParts(new Date(iso + 'T00:00:00'));
  return { y: p.find((x) => x.type === 'year')?.value, m: parseInt(p.find((x) => x.type === 'month')?.value, 10) };
}
const netOf = (b) => (b.paymentStatus === 'paid' || b.paymentStatus === 'refunded' ? b.amount - (b.refundAmount || 0) : 0);

export default async function AdminDashboard({ searchParams }) {
  const sp = (await searchParams) || {};
  const period = sp.period || '30';

  const all = await prisma.booking.findMany({ include: { service: true, service2: true }, orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }] });

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

    if (b.status !== 'cancelled') {
      perHour[b.timeSlot] = (perHour[b.timeSlot] || 0) + 1;
    }
    const n = netOf(b);
    if (b.paymentStatus === 'paid' || b.paymentStatus === 'refunded') {
      net += n; paidCount++;
      refunded += b.refundAmount || 0;
      const name = servicesLabelOf(b);
      perService[name] = (perService[name] || 0) + n;
    } else if (b.paymentStatus === 'unpaid' && b.status !== 'cancelled') {
      pending += b.amount;
    }
  }
  const totalCount = filtered.length;
  const avg = paidCount ? Math.round(net / paidCount) : 0;

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
  const maxChart = Math.max(1, ...chart.map((c) => c.net));
  const maxHour = Math.max(1, ...TIME_SLOTS.map((t) => perHour[t] || 0));
  const services = Object.entries(perService).sort(([, a], [, b]) => b - a);
  const maxService = Math.max(1, ...services.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">داشبورد</h2>
        <p className="text-xs text-zinc-400 mt-1">درآمد و عملکردِ آرایشگاه در یک نگاه</p>
      </div>

      {/* نوار نگاه کلی */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlanceCard icon={CalendarDays} label="درآمد امروز" value={incToday} tint="emerald" />
        <GlanceCard icon={CalendarRange} label="درآمد این ماه" value={incMonth} tint="amber" />
        <GlanceCard icon={Coins} label="درآمد امسال" value={incYear} tint="sky" />
      </div>

      {/* انتخابگر بازه */}
      <DashboardPeriod value={period} />

      {/* KPIهای بازه */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Wallet} tint="text-emerald-400" label="درآمد خالص" value={formatPrice(net)} sub={PERIOD_LABELS[period]} big />
        <Kpi icon={Receipt} tint="text-zinc-100" label="تعداد نوبت" value={toPersianDigits(totalCount)} sub={`${toPersianDigits(paidCount)} پرداخت‌شده`} />
        <Kpi icon={TrendingUp} tint="text-amber-400" label="میانگین هر نوبت" value={formatPrice(avg)} sub="درآمد میانگین" />
        <Kpi icon={Hourglass} tint="text-sky-300" label="در انتظار پرداخت" value={formatPrice(pending)} sub={refunded ? `${formatPrice(refunded)} مسترد` : 'طلب'} />
      </div>

      {/* نمودار درآمد */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-zinc-200">روند درآمد ({PERIOD_LABELS[period]})</span>
          </div>
          <span className="text-[11px] text-zinc-500">{chartMode === 'daily' ? 'روزانه' : 'ماهانه'}</span>
        </div>
        {chart.every((c) => c.net === 0) ? (
          <p className="text-xs text-zinc-500 text-center py-12">در این بازه درآمدی ثبت نشده است.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-44 overflow-x-auto pb-1">
            {chart.map((c, i) => (
              <div key={i} className="flex flex-col items-center justify-end gap-1.5 flex-1 min-w-[26px] group" title={`${c.full}: ${formatPrice(c.net)}`}>
                <span className="text-[9px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{c.net ? toPersianDigits(Math.round(c.net / 1000)) + 'ه' : ''}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 transition-all"
                  style={{ height: `${Math.max(2, Math.round((c.net / maxChart) * 100))}%` }}
                />
                <span className="text-[9px] text-zinc-500 whitespace-nowrap">{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* دو ستون: ساعت‌ها + خدمات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-zinc-200">شلوغیِ ساعت‌ها</span>
          </div>
          <div className="space-y-2">
            {TIME_SLOTS.map((t) => {
              const c = perHour[t] || 0;
              return (
                <div key={t} className="flex items-center gap-3 text-[11px]">
                  <span className="w-10 font-mono text-zinc-400 shrink-0">{toPersianDigits(t)}</span>
                  <div className="flex-1 h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-amber-500 to-amber-600 rounded-full" style={{ width: `${Math.round((c / maxHour) * 100)}%` }} />
                  </div>
                  <span className="w-12 text-left text-zinc-400 shrink-0">{toPersianDigits(c)} نوبت</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scissors className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-zinc-200">درآمد به تفکیک خدمت</span>
          </div>
          {services.length === 0 ? (
            <p className="text-xs text-zinc-500 py-8 text-center">داده‌ای برای نمایش نیست.</p>
          ) : (
            <div className="space-y-3">
              {services.map(([name, v]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-zinc-300 font-semibold">{name}</span>
                    <span className="text-emerald-500 font-extrabold">{formatPrice(v)}</span>
                  </div>
                  <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-emerald-500 to-emerald-600 rounded-full" style={{ width: `${Math.round((v / maxService) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-900">
            <Pill label="تایید شده" count={confirmed} cls="bg-emerald-500/10 text-emerald-400 border-emerald-500/20" />
            <Pill label="در انتظار" count={pend} cls="bg-amber-500/10 text-amber-400 border-amber-500/20" />
            <Pill label="لغو" count={cancelled} cls="bg-red-500/10 text-red-400 border-red-500/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GlanceCard({ icon: Icon, label, value, tint }) {
  const tints = {
    emerald: 'from-emerald-500/15 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/15 text-amber-400 border-amber-500/20',
    sky: 'from-sky-500/15 text-sky-300 border-sky-500/20',
  };
  return (
    <div className={cn('rounded-2xl p-4 border bg-gradient-to-br to-transparent flex items-center justify-between', tints[tint])}>
      <div>
        <p className="text-[11px] text-zinc-300 font-bold mb-1">{label}</p>
        <p className="text-lg md:text-xl font-extrabold">{formatPrice(value)}</p>
      </div>
      <Icon className="w-8 h-8 opacity-40" />
    </div>
  );
}

function Kpi({ icon: Icon, tint, label, value, sub, big }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-zinc-500 font-bold">{label}</span>
        <Icon className={cn('w-4 h-4', tint)} />
      </div>
      <p className={cn('font-extrabold', big ? 'text-xl md:text-2xl' : 'text-lg md:text-xl', big ? tint : 'text-zinc-100')}>{value}</p>
      <p className="text-[10px] text-zinc-500 mt-1">{sub}</p>
    </div>
  );
}

function Pill({ label, count, cls }) {
  return (
    <span className={cn('flex-1 text-center px-2 py-1.5 rounded-lg text-[10px] font-bold border', cls)}>
      {label}: {toPersianDigits(count)}
    </span>
  );
}
