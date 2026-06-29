import { prisma } from '@/lib/db';
import { Calendar, DollarSign, Users, XCircle } from 'lucide-react';
import { formatPrice, toPersianDigits } from '@/lib/persian';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [total, pending, confirmed, cancelled, confirmedBookings, ratingAgg] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'pending' } }),
    prisma.booking.count({ where: { status: 'confirmed' } }),
    prisma.booking.count({ where: { status: 'cancelled' } }),
    prisma.booking.findMany({ where: { status: 'confirmed' }, include: { service: true } }),
    prisma.review.aggregate({ _avg: { rating: true } }),
  ]);

  const revenue = confirmedBookings.reduce((sum, b) => sum + (b.service?.price || 0), 0);
  const avgRating = ratingAgg._avg.rating ? ratingAgg._avg.rating.toFixed(1) : '—';
  const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-white">داشبورد مدیریت</h2>
        <p className="text-xs text-zinc-400 mt-1">نمای کلی از وضعیت نوبت‌ها و درآمد آرایشگاه</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="کل نوبت‌ها" icon={Calendar} iconClass="text-amber-500">
          <p className="text-2xl font-extrabold text-zinc-100">{toPersianDigits(total)}</p>
          <div className="flex gap-2 text-[10px] text-zinc-400 mt-2">
            <span className="text-amber-500 font-semibold">{toPersianDigits(pending)} در انتظار</span>
            <span>•</span>
            <span className="text-emerald-500 font-semibold">{toPersianDigits(confirmed)} تایید شده</span>
          </div>
        </Card>

        <Card title="درآمد (تایید شده)" icon={DollarSign} iconClass="text-emerald-500">
          <p className="text-2xl font-extrabold text-emerald-500">{formatPrice(revenue)}</p>
          <div className="text-[10px] text-zinc-500 mt-2">مجموع نوبت‌های تاییدشده</div>
        </Card>

        <Card title="میانگین رضایت" icon={Users} iconClass="text-amber-400">
          <p className="text-2xl font-extrabold text-amber-500">
            {toPersianDigits(avgRating)} <span className="text-xs text-zinc-400 font-normal">از ۵</span>
          </p>
          <div className="text-[10px] text-zinc-500 mt-2">بر اساس نظرات ثبت‌شده</div>
        </Card>

        <Card title="ضریب کنسلی" icon={XCircle} iconClass="text-red-500">
          <p className="text-2xl font-extrabold text-red-500">{toPersianDigits(cancelRate)}٪</p>
          <div className="text-[10px] text-zinc-500 mt-2">تعداد لغو: {toPersianDigits(cancelled)} مورد</div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, iconClass, children }) {
  return (
    <div className="glass p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500 font-bold">{title}</span>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>
      {children}
    </div>
  );
}
