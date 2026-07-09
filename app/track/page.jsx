'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Search, Scissors, Calendar, Clock, User, Scissors as ScissorsIcon, XCircle } from 'lucide-react';
import { lookupSchema } from '@/lib/validation';
import { lookupBooking, cancelBooking } from '@/api/bookings';
import { toPersianDigits, formatJalaliDate, formatPrice } from '@/lib/persian';
import { servicesLabelOf } from '@/lib/serializers';
import { STATUS_LABELS, STATUS_STYLES } from '@/lib/constants';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import { confirm } from '@/components/ui/confirm';
import { cn } from '@/lib/utils';

export default function TrackPage() {
  const [bookings, setBookings] = useState(null);
  const [cancellingCode, setCancellingCode] = useState(null);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(lookupSchema),
    defaultValues: { phone: '' },
  });

  const onSubmit = async (data) => {
    try {
      const result = await lookupBooking(data);
      setBookings(Array.isArray(result) ? result : [result]);
    } catch (e) {
      setBookings([]);
      toast.error(e.message);
    }
  };

  const onCancel = async (code) => {
    const ok = await confirm({
      title: 'لغو نوبت',
      description: 'آیا از لغو این نوبت مطمئن هستید؟ این کار قابل بازگشت نیست.',
      confirmText: 'بله، لغو شود',
      cancelText: 'انصراف',
      danger: true,
    });
    if (!ok) return;
    setCancellingCode(code);
    try {
      await cancelBooking({ code });
      // فهرست را با همان شماره دوباره می‌گیریم تا وضعیت به‌روز شود.
      const refreshed = await lookupBooking({ phone: getValues('phone') });
      setBookings(Array.isArray(refreshed) ? refreshed : [refreshed]);
      toast.success('نوبت شما لغو شد.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancellingCode(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 px-6 py-12">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg shadow-lg">
            <Scissors className="w-5 h-5 text-black" />
          </div>
          <span dir="ltr" className="font-sans font-extrabold text-xl tracking-wider text-amber-500">
            banad <span className="text-white">barber</span>
          </span>
        </Link>

        <div className="glass p-8 rounded-3xl border border-zinc-800">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-white">رهگیری نوبت</h1>
            <p className="text-xs text-zinc-400 mt-1">شماره موبایلی که هنگام رزرو وارد کردید را بنویسید تا نوبت‌هایتان را ببینید.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="شماره موبایل:" error={errors.phone?.message}>
              <Input type="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" style={{ direction: 'ltr', textAlign: 'left' }} error={errors.phone} {...register('phone')} />
            </Field>
            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              نمایش نوبت‌های من
            </Button>
          </form>
        </div>

        {bookings && bookings.length === 0 && (
          <p className="text-center text-zinc-500 text-sm mt-6">نوبتی با این شماره یافت نشد.</p>
        )}

        {bookings && bookings.length > 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-xs text-zinc-400 text-center">
              {toPersianDigits(bookings.length)} نوبت برای این شماره ثبت شده است:
            </p>
            {bookings.map((booking) => (
              <div key={booking.code} className="glass p-6 rounded-3xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                  <span className="text-sm font-bold text-zinc-300">کد: <span className="font-mono text-amber-500">{booking.code}</span></span>
                  <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border', STATUS_STYLES[booking.status])}>
                    {STATUS_LABELS[booking.status]}
                  </span>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 text-center">
                  <p className="text-[11px] text-zinc-400 mb-1">زمان نوبت شما</p>
                  <p className="text-sm font-extrabold text-amber-400">
                    {formatJalaliDate(booking.date, { weekday: 'long', day: 'numeric', month: 'long' })} — ساعت {toPersianDigits(booking.timeSlot)}
                  </p>
                </div>

                <Row icon={ScissorsIcon} label="خدمت" value={servicesLabelOf(booking)} />
                <Row icon={User} label="مشتری" value={booking.customerName} />
                {booking.refundAmount > 0 && (
                  <Row icon={ScissorsIcon} label="مبلغ بازگشتی" value={formatPrice(booking.refundAmount)} />
                )}

                {booking.status !== 'cancelled' && (
                  <Button
                    variant="danger"
                    className="w-full mt-2"
                    loading={cancellingCode === booking.code}
                    onClick={() => onCancel(booking.code)}
                  >
                    <XCircle className="w-4 h-4" />
                    لغو این نوبت
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Link href="/" className="block text-center text-xs text-zinc-500 hover:text-zinc-300 mt-6 transition-colors">
          ← بازگشت به سایت
        </Link>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-amber-500" />}
        {label}:
      </span>
      <span className={cn('font-bold text-white', mono && 'font-mono text-amber-500')}>{value}</span>
    </div>
  );
}
