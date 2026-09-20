'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Filter, Search, CheckCircle, XCircle, Trash2, AlertCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useBookings, useUpdateBookingStatus, useDeleteBooking } from '@/api/bookings';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { toPersianDigits, formatJalaliDate, formatPrice } from '@/lib/persian';
import { servicesLabelOf } from '@/lib/serializers';
import { STATUS_LABELS, PAYMENT_LABELS, STATUS_STYLES, PAYMENT_STYLES } from '@/lib/constants';
import { REFUNDS_ENABLED } from '@/lib/features';
import { confirm } from '@/components/ui/confirm';
import ErrorState from '@/components/ui/ErrorState';
import Select from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const BORDER = {
  confirmed: 'border-r-emerald-500',
  cancelled: 'border-r-red-500',
  pending: 'border-r-amber-500',
};

// متنِ پاپ‌آپِ لغو باید همان کاری را توصیف کند که واقعاً انجام می‌شود. با استردادِ خاموش،
// لغو فقط «لغو» است و هیچ پولی خودکار برنمی‌گردد؛ متنِ قبلی وعده‌ی استردادِ خودکار می‌داد.
const CANCEL_CONFIRM_TEXT = REFUNDS_ENABLED
  ? 'این نوبت لغو می‌شود و مبلغ پرداختی طبق قاعده به مشتری مسترد می‌گردد. مطمئن هستید؟'
  : 'این نوبت لغو می‌شود. مبلغ پرداختی به‌صورت خودکار برنمی‌گردد و باید دستی با مشتری تسویه کنید. مطمئن هستید؟';

export default function BookingsManager() {
  const [filters, setFilters] = useState({ status: 'all', paymentStatus: 'all', date: 'upcoming', page: 1, pageSize: 10 });
  // ورودیِ جست‌وجو جدا نگه داشته می‌شود و فقط بعد از ۳۵۰ms سکوت وارد queryKey می‌شود
  // تا به‌ازای هر کاراکتر یک درخواست به سرور نرود (جلوگیری از طوفانِ درخواست).
  const [qInput, setQInput] = useState('');
  const debouncedQ = useDebouncedValue(qInput, 350);

  // با تغییرِ عبارتِ جست‌وجو به صفحه‌ی اول برگرد.
  useEffect(() => { setFilters((f) => ({ ...f, page: 1 })); }, [debouncedQ]);

  const query = { ...filters, q: debouncedQ };
  const { data, isLoading, isFetching, isError, error, refetch } = useBookings(query);
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

  // تسویه‌ی دستیِ پولِ یک نوبتِ لغوشده — دو حالت دارد:
  //   • «در انتظار استرداد» — سیستم خودش ساخته (پول گرفته شد ولی نوبت قطعی نشد)
  //   • «پرداخت‌شده»        — لغوِ عادی؛ پول هنوز دستِ آرایشگاه است و باید تعیین‌تکلیف شود.
  // بدونِ این، آن رکورد تا ابد معلق می‌ماند و هیچ راهی برای علامت‌زدنش وجود ندارد.
  const onSettleRefund = async (booking, mode) => {
    const refunded = mode === 'refunded';
    // مبلغِ واقعی نشان داده می‌شود، نه عبارتِ مبهمِ «کلِ مبلغ»: برای لغوِ مشتری قاعده ۵۰٪
    // است، پس «کلِ مبلغ» به ادمین آدرسِ غلط می‌داد و رقمِ اشتباه ثبت می‌شد.
    const share = Math.floor((booking.amount || 0) * (booking.cancelledBy === 'customer' ? 0.5 : 1));
    const ok = await confirm({
      title: refunded ? 'ثبت استرداد دستی' : 'ثبت توافق با مشتری',
      description: refunded
        ? `تأیید می‌کنی که ${formatPrice(share)} را به مشتری برگردانده‌ای؟ وضعیت به «مسترد شده» تغییر می‌کند.`
        : 'تأیید می‌کنی که مبلغ نزدِ آرایشگاه می‌ماند و با مشتری به توافق رسیده‌اید؟ وضعیت به «پرداخت‌شده» تغییر می‌کند.',
      confirmText: 'تأیید',
    });
    if (!ok) return;
    updateStatus.mutate({ id: booking.id, paymentStatus: mode }, {
      onSuccess: () => toast.success('وضعیت پرداخت ثبت شد.'),
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

  // لغو با پاپ‌آپِ تایید — تا اگر دکمه اشتباهی خورد، نوبت بی‌هوا لغو نشود.
  const onCancel = async (id) => {
    const ok = await confirm({
      title: 'لغو نوبت',
      description: CANCEL_CONFIRM_TEXT,
      danger: true,
      confirmText: 'بله، لغو کن',
      cancelText: 'انصراف',
    });
    if (!ok) return;
    onChangeStatus(id, 'cancelled');
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white">مدیریت نوبت‌ها</h2>
        <p className="text-xs text-zinc-400 mt-1">فیلتر، جست‌وجو و تغییر وضعیت رزروها</p>
      </div>

      {/* فیلترها */}
      <div className="glass p-4 rounded-2xl mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="md:col-span-1 relative">
          <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="جست‌وجوی نام یا موبایل..."
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            className="pr-9"
          />
        </div>
        {/* برچسبِ وضعیت‌ها از همان منبعی می‌آید که بَجِ هر ردیف — وگرنه فیلترِ «در انتظار تایید»
            ردیف‌هایی با بَجِ «منتظر تایید» نشان می‌داد و کاربر شک می‌کرد فیلتر کار کرده یا نه. */}
        <Select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
          <option value="all">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        {/* فیلترِ وضعیتِ پرداخت — بدونِ آن، پیداکردنِ نوبت‌های «در انتظار استرداد» (که پولشان
            گرفته شده ولی تسویه نشده) بینِ کلِ فهرست عملاً ناممکن بود. */}
        <Select value={filters.paymentStatus} onChange={(e) => setFilter({ paymentStatus: e.target.value })}>
          <option value="all">همه پرداخت‌ها</option>
          {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        {/* 🔴 «همه تاریخ‌ها»ی قبلی در واقع «از امروز به بعد» بود و نوبت‌های گذشته را نشان نمی‌داد؛
            حالا برچسب راست می‌گوید و دو گزینه‌ی واقعی برای دیدنِ سابقه اضافه شده. */}
        <Select value={filters.date} onChange={(e) => setFilter({ date: e.target.value })}>
          <option value="upcoming">از امروز به بعد</option>
          <option value="today">امروز</option>
          <option value="tomorrow">فردا</option>
          <option value="past">نوبت‌های گذشته</option>
          <option value="all">همه (با گذشته)</option>
        </Select>
      </div>

      {/* فهرست */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm py-16">
          <Loader2 className="w-5 h-5 animate-spin" /> در حال بارگذاری...
        </div>
      ) : isError ? (
        // خطا از «خالی» تفکیک شده: قبلاً قطعیِ سرور همان پیامِ «نوبتی یافت نشد» را می‌داد.
        <ErrorState error={error} onRetry={refetch} />
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
                  {/* شماره با ارقامِ لاتین می‌ماند: این یک شناسه است که باید کپی و در واتس‌اپ/
                      دفترچه‌تلفن جست‌وجو شود، و ارقامِ فارسی آنجا پیدا نمی‌شوند. */}
                  <p className="font-mono text-xs text-zinc-500 mt-0.5" style={{ direction: 'ltr', textAlign: 'right' }}>{b.customerPhone}</p>
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
                  <p className="font-mono text-[10px] text-zinc-600 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>کد پرداخت: {b.paymentRefId}</p>
                )}
                {b.refundAmount > 0 && (
                  <p className="text-[10px] text-sky-400 mt-0.5">
                    مسترد: {formatPrice(b.refundAmount)} {b.cancelledBy === 'admin' ? '(توسط مدیریت)' : '(توسط مشتری)'}
                  </p>
                )}
              </div>

              <div className="lg:col-span-1 lg:text-center flex flex-row lg:flex-col items-center lg:items-center gap-1.5">
                <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap', STATUS_STYLES[b.status])}>
                  {STATUS_LABELS[b.status] || 'نامشخص'}
                </span>
                <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap', PAYMENT_STYLES[b.paymentStatus] || PAYMENT_STYLES.unpaid)}>
                  {PAYMENT_LABELS[b.paymentStatus] || PAYMENT_LABELS.unpaid}
                </span>
              </div>

              <div className="lg:col-span-3 flex flex-wrap items-center justify-end gap-2 border-t lg:border-t-0 border-zinc-900/60 pt-4 lg:pt-0">
                {/* تایید فقط برای نوبتی که هنوز تایید نشده و پولش دریافت شده. همان قاعده‌ای که
                    سرور هم اعمالش می‌کند — اینجا فقط دکمه‌ی بی‌فایده نشان داده نمی‌شود. */}
                {b.status === 'pending' && b.paymentStatus === 'paid' && (
                  <button onClick={() => onChangeStatus(b.id, 'confirmed')} title="تأیید" className="p-2 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-500 hover:text-black rounded-lg border border-emerald-900/50 hover:border-transparent transition-all">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {b.status !== 'cancelled' && (
                  <button onClick={() => onCancel(b.id)} title="لغو" className="p-2 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-black rounded-lg border border-red-900/50 hover:border-transparent transition-all">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => onDelete(b.id)} title="حذف دائمی" className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                {/* تعیین‌تکلیفِ پولِ نوبتِ لغوشده. هم برای «در انتظار استرداد» (پول گرفته شد
                    ولی نوبت قطعی نشد) و هم برای «پرداخت‌شده» — که با استردادِ خودکارِ خاموش،
                    حالتِ عادیِ هر لغوِ یک نوبتِ پرداخت‌شده است. */}
                {b.status === 'cancelled' && ['refundPending', 'paid'].includes(b.paymentStatus) && (
                  <div className="flex items-center gap-1.5 w-full lg:w-auto">
                    <Button variant="outline" size="sm" onClick={() => onSettleRefund(b, 'refunded')}>
                      پول را برگرداندم
                    </Button>
                    {b.paymentStatus === 'refundPending' && (
                      <Button variant="ghost" size="sm" onClick={() => onSettleRefund(b, 'paid')}>
                        توافق شد
                      </Button>
                    )}
                  </div>
                )}
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
            <Button variant="outline" size="sm" disabled={filters.page <= 1 || isFetching} onClick={() => setFilter({ page: filters.page - 1 })}>
              <ChevronRight className="w-4 h-4" /> قبلی
            </Button>
            <span className="px-2">صفحه {toPersianDigits(filters.page)} از {toPersianDigits(totalPages)}</span>
            <Button variant="outline" size="sm" disabled={filters.page >= totalPages || isFetching} onClick={() => setFilter({ page: filters.page + 1 })}>
              بعدی <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
