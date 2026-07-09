import { prisma } from '@/lib/db';
import { serializeBarbers } from '@/lib/serializers';
import { Wallet, TrendingUp, Undo2, Hourglass, Calendar, XCircle, Scissors } from 'lucide-react';
import { formatPrice, toPersianDigits, formatJalaliDate } from '@/lib/persian';
import { cn } from '@/lib/utils';
import DashboardFilters from '@/features/admin/DashboardFilters';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ searchParams }) {
  const sp = (await searchParams) || {};
  const barberId = sp.barberId || undefined;
  const from = sp.from || undefined;
  const to = sp.to || undefined;

  // فیلتر: بر اساس آرایشگر و بازه‌ی تاریخ (تاریخ رشته‌ی ISO است و مقایسه‌ی رشته‌ای درست کار می‌کند).
  const where = {};
  if (barberId) where.barberId = barberId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }

  const [barbersRaw, bookings] = await Promise.all([
    prisma.barber.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.booking.findMany({
      where,
      include: { service: true, service2: true },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    }),
  ]);
  const barbers = serializeBarbers(barbersRaw);

  // ── محاسبات مالی ──
  let grossReceived = 0;   // کل پولی که تا حالا وارد شده (پرداخت‌شده + مستردشده)
  let totalRefunded = 0;   // مجموع مبالغ مستردشده
  let pendingUnpaid = 0;   // طلب: رزروهای پرداخت‌نشده‌ی فعال
  let paidCount = 0, refundedCount = 0, unpaidCount = 0, cancelledCount = 0;
  const perDay = {};       // تاریخ → { received, refunded }
  const perService = {};   // نام خدمت → درآمد خالص

  for (const b of bookings) {
    if (b.status === 'cancelled') cancelledCount++;

    if (b.paymentStatus === 'paid' || b.paymentStatus === 'refunded') {
      grossReceived += b.amount;
      perDay[b.date] = perDay[b.date] || { received: 0, refunded: 0 };
      perDay[b.date].received += b.amount;

      if (b.paymentStatus === 'refunded') {
        totalRefunded += b.refundAmount || 0;
        refundedCount++;
        perDay[b.date].refunded += b.refundAmount || 0;
      } else {
        paidCount++;
      }

      // درآمد خالص هر نوبت را به خدمت اصلی نسبت می‌دهیم.
      const net = b.amount - (b.refundAmount || 0);
      const name = b.service?.name || 'نامشخص';
      perService[name] = (perService[name] || 0) + net;
    } else if (b.paymentStatus === 'unpaid' && b.status !== 'cancelled') {
      pendingUnpaid += b.amount;
      unpaidCount++;
    }
  }

  const netIncome = grossReceived - totalRefunded; // چقدر واقعاً نگه داشته
  const total = bookings.length;
  const cancelRate = total > 0 ? Math.round((cancelledCount / total) * 100) : 0;
  const days = Object.entries(perDay).sort(([a], [b]) => (a < b ? -1 : 1));
  const services = Object.entries(perService).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-white">داشبورد مالی</h2>
        <p className="text-xs text-zinc-400 mt-1">گردش مالی، درآمد و طلبِ آرایشگاه — با فیلتر بازه و آرایشگر</p>
      </div>

      <DashboardFilters barbers={barbers} barberId={barberId} from={from} to={to} />

      {/* کارت‌های مالی اصلی */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="درآمد خالص (موجودی)" icon={Wallet} iconClass="text-emerald-500">
          <p className="text-2xl font-extrabold text-emerald-500">{formatPrice(netIncome)}</p>
          <div className="text-[10px] text-zinc-500 mt-2">پول واقعیِ نگه‌داشته‌شده</div>
        </Card>

        <Card title="کل دریافتی (ناخالص)" icon={TrendingUp} iconClass="text-amber-500">
          <p className="text-2xl font-extrabold text-zinc-100">{formatPrice(grossReceived)}</p>
          <div className="text-[10px] text-zinc-500 mt-2">{toPersianDigits(paidCount + refundedCount)} پرداخت موفق</div>
        </Card>

        <Card title="مسترد شده" icon={Undo2} iconClass="text-sky-400">
          <p className="text-2xl font-extrabold text-sky-400">{formatPrice(totalRefunded)}</p>
          <div className="text-[10px] text-zinc-500 mt-2">{toPersianDigits(refundedCount)} مورد لغو با استرداد</div>
        </Card>

        <Card title="در انتظار پرداخت (طلب)" icon={Hourglass} iconClass="text-amber-400">
          <p className="text-2xl font-extrabold text-amber-400">{formatPrice(pendingUnpaid)}</p>
          <div className="text-[10px] text-zinc-500 mt-2">{toPersianDigits(unpaidCount)} رزرو پرداخت‌نشده</div>
        </Card>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="کل نوبت‌ها" icon={Calendar} iconClass="text-amber-500">
          <p className="text-2xl font-extrabold text-zinc-100">{toPersianDigits(total)}</p>
          <div className="text-[10px] text-zinc-500 mt-2">در بازه‌ی انتخاب‌شده</div>
        </Card>
        <Card title="ضریب کنسلی" icon={XCircle} iconClass="text-red-500">
          <p className="text-2xl font-extrabold text-red-500">{toPersianDigits(cancelRate)}٪</p>
          <div className="text-[10px] text-zinc-500 mt-2">تعداد لغو: {toPersianDigits(cancelledCount)} مورد</div>
        </Card>
        <div className="glass p-5 rounded-2xl col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Scissors className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-zinc-400 font-bold">درآمد خالص به تفکیک خدمت</span>
          </div>
          {services.length === 0 ? (
            <p className="text-xs text-zinc-500">داده‌ای برای نمایش نیست.</p>
          ) : (
            <div className="space-y-2">
              {services.map(([name, amount]) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">{name}</span>
                  <span className="font-extrabold text-emerald-500">{formatPrice(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* جدول گردش مالی روزانه */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-zinc-900">
          <TrendingUp className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-zinc-200">گردش مالی روزانه</span>
        </div>
        {days.length === 0 ? (
          <p className="text-xs text-zinc-500 p-6 text-center">در این بازه تراکنشی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-900/60">
                  <th className="text-right font-bold p-3">تاریخ</th>
                  <th className="text-left font-bold p-3">دریافتی</th>
                  <th className="text-left font-bold p-3">مسترد شده</th>
                  <th className="text-left font-bold p-3">خالص روز</th>
                </tr>
              </thead>
              <tbody>
                {days.map(([date, v]) => (
                  <tr key={date} className="border-b border-zinc-900/40 last:border-0">
                    <td className="text-right p-3 text-zinc-300">{formatJalaliDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}</td>
                    <td className="text-left p-3 text-zinc-200 font-bold">{formatPrice(v.received)}</td>
                    <td className="text-left p-3 text-sky-400">{v.refunded ? formatPrice(v.refunded) : '—'}</td>
                    <td className="text-left p-3 text-emerald-500 font-extrabold">{formatPrice(v.received - v.refunded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, iconClass, children }) {
  return (
    <div className="glass p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500 font-bold">{title}</span>
        <Icon className={cn('w-4 h-4', iconClass)} />
      </div>
      {children}
    </div>
  );
}
