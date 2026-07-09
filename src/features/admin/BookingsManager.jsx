'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Filter, Search, CheckCircle, XCircle, Trash2, AlertCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useBookings, useUpdateBookingStatus, useDeleteBooking } from '@/api/bookings';
import { toPersianDigits, formatJalaliDate, formatPrice } from '@/lib/persian';
import { servicesLabelOf } from '@/lib/serializers';
import { STATUS_LABELS, PAYMENT_LABELS, STATUS_STYLES, PAYMENT_STYLES } from '@/lib/constants';
import { confirm } from '@/components/ui/confirm';
import Select from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const BORDER = {
  confirmed: 'border-r-emerald-500',
  cancelled: 'border-r-red-500',
  pending: 'border-r-amber-500',
};

export default function BookingsManager() {
  const [filters, setFilters] = useState({ status: 'all', date: 'all', q: '', page: 1, pageSize: 10 });
  const { data, isLoading, isFetching } = useBookings(filters);
  const updateStatus = useUpdateBookingStatus();
  const deleteBooking = useDeleteBooking();

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const onChangeStatus = (id, status) => {
    updateStatus.mutate({ id, status }, {
      onSuccess: () => toast.success('وضعیت نوبت به‌روزرسانی شد.'),
      onError: (e) => toast.error(e.message),
    });
  };

  const onDelete = async (id) => {
    const ok = await confirm({ title: 'حذف نوبت', description: 'این نوبت برای همیشه حذف می‌شود. ادامه می‌دهید؟', danger: true, confirmText: 'حذف' });
    if (!ok) return;
    deleteBooking.mutate(id, {
      onSuccess: () => toast.success('نوبت حذف شد.'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white">مدیریت نوبت‌ها</h2>
        <p className="text-xs text-zinc-400 mt-1">فیلتر، جست‌وجو و تغییر وضعیت رزروها</p>
      </div>

      {/* فیلترها */}
      <div className="glass p-4 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="جست‌وجوی نام یا موبایل..."
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            className="pr-9"
          />
        </div>
        <Select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
          <option value="all">همه وضعیت‌ها</option>
          <option value="pending">در انتظار تایید</option>
          <option value="confirmed">تایید شده</option>
          <option value="cancelled">لغو شده</option>
        </Select>
        <Select value={filters.date} onChange={(e) => setFilter({ date: e.target.value })}>
          <option value="all">همه تاریخ‌ها</option>
          <option value="today">امروز</option>
          <option value="tomorrow">فردا</option>
        </Select>
      </div>

      {/* فهرست */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm py-16">
          <Loader2 className="w-5 h-5 animate-spin" /> در حال بارگذاری...
        </div>
      ) : items.length === 0 ? (
        <div className="glass p-12 rounded-3xl text-center text-zinc-500 flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-zinc-600 mb-4" />
          <p className="text-sm font-semibold">نوبتی با این فیلترها یافت نشد.</p>
        </div>
      ) : (
        <div className={cn('space-y-3 transition-opacity', isFetching && 'opacity-60')}>
          {items.map((b) => (
            <div key={b.id} className={cn('glass p-5 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-4 items-center border-r-4', BORDER[b.status])}>
              <div className="lg:col-span-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-sm">
                  {b.customerName.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-100">{b.customerName}</p>
                  <p className="font-mono text-xs text-zinc-500 mt-0.5" style={{ direction: 'ltr', textAlign: 'right' }}>{toPersianDigits(b.customerPhone)}</p>
                </div>
              </div>

              <div className="lg:col-span-3">
                <p className="font-semibold text-xs text-zinc-300">{servicesLabelOf(b)}</p>
                <p className="text-[10px] text-amber-500 font-extrabold mt-0.5">{formatPrice(b.amount || 0)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">آرایشگر: {b.barber?.name || 'نامشخص'}</p>
              </div>

              <div className="lg:col-span-2 text-xs text-zinc-300">
                <p>{formatJalaliDate(b.date, { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                <p className="font-bold text-zinc-200 mt-1">ساعت {toPersianDigits(b.timeSlot)}</p>
                <p className="font-mono text-[10px] text-zinc-600 mt-0.5">{b.code}</p>
                {b.paymentRefId && (
                  <p className="font-mono text-[10px] text-zinc-600 mt-0.5">کد پرداخت: {toPersianDigits(b.paymentRefId)}</p>
                )}
                {b.refundAmount > 0 && (
                  <p className="text-[10px] text-sky-400 mt-0.5">
                    مسترد: {formatPrice(b.refundAmount)} {b.cancelledBy === 'admin' ? '(توسط مدیریت)' : '(توسط مشتری)'}
                  </p>
                )}
              </div>

              <div className="lg:col-span-1 lg:text-center flex flex-row lg:flex-col items-center lg:items-center gap-1.5">
                <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap', STATUS_STYLES[b.status])}>
                  {STATUS_LABELS[b.status]}
                </span>
                <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap', PAYMENT_STYLES[b.paymentStatus] || PAYMENT_STYLES.unpaid)}>
                  {PAYMENT_LABELS[b.paymentStatus] || PAYMENT_LABELS.unpaid}
                </span>
              </div>

              <div className="lg:col-span-3 flex items-center justify-end gap-2 border-t lg:border-t-0 border-zinc-900/60 pt-4 lg:pt-0">
                {b.status !== 'confirmed' && (
                  <button onClick={() => onChangeStatus(b.id, 'confirmed')} title="تایید" className="p-2 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-lg border border-emerald-900/50 hover:border-transparent transition-all">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {b.status !== 'cancelled' && (
                  <button onClick={() => onChangeStatus(b.id, 'cancelled')} title="لغو" className="p-2 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-black rounded-lg border border-red-900/50 hover:border-transparent transition-all">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => onDelete(b.id)} title="حذف دائمی" className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* صفحه‌بندی */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-6 text-xs text-zinc-400">
          <span>نمایش {toPersianDigits(items.length)} از {toPersianDigits(total)} نوبت</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setFilter({ page: filters.page - 1 })}>
              <ChevronRight className="w-4 h-4" /> قبلی
            </Button>
            <span className="px-2">صفحه {toPersianDigits(filters.page)} از {toPersianDigits(totalPages)}</span>
            <Button variant="outline" size="sm" disabled={filters.page >= totalPages} onClick={() => setFilter({ page: filters.page + 1 })}>
              بعدی <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
