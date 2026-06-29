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
import { STATUS_LABELS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import { confirm } from '@/components/ui/confirm';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function TrackPage() {
  const [booking, setBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(lookupSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = async (data) => {
    try {
      const result = await lookupBooking(data);
      setBooking(result);
    } catch (e) {
      setBooking(null);
      toast.error(e.message);
    }
  };

  const onCancel = async () => {
    const ok = await confirm({
      title: 'لغو نوبت',
      description: 'آیا از لغو این نوبت مطمئن هستید؟ این کار قابل بازگشت نیست.',
      confirmText: 'بله، لغو شود',
      cancelText: 'انصراف',
      danger: true,
    });
    if (!ok) return;
    setCancelling(true);
    try {
      const { code } = getValues();
      const updated = await cancelBooking({ code });
      setBooking(updated);
      toast.success('نوبت شما لغو شد.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 px-6 py-12">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg shadow-lg">
            <Scissors className="w-5 h-5 text-black" />
          </div>
          <span className="font-sans font-extrabold text-xl tracking-wider text-amber-500">
            پیرایش <span className="text-white">رویال</span>
          </span>
        </Link>

        <div className="glass p-8 rounded-3xl border border-zinc-800">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-white">رهگیری نوبت</h1>
            <p className="text-xs text-zinc-400 mt-1">کد رهگیری نوبت خود را وارد کنید.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="کد رهگیری:" error={errors.code?.message}>
              <Input placeholder="مثال: BK1A2B3C" style={{ direction: 'ltr', textAlign: 'left' }} error={errors.code} {...register('code')} />
            </Field>
            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              جست‌وجوی نوبت
            </Button>
          </form>
        </div>

        {booking && (
          <div className="glass p-6 rounded-3xl border border-zinc-800 mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
              <span className="text-sm font-bold text-zinc-300">نتیجه‌ی رهگیری</span>
              <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border', STATUS_STYLES[booking.status])}>
                {STATUS_LABELS[booking.status]}
              </span>
            </div>

            <Row icon={User} label="مشتری" value={booking.customerName} />
            <Row icon={ScissorsIcon} label="خدمت" value={booking.service ? `${booking.service.name} (${formatPrice(booking.service.price)})` : 'نامشخص'} />
            <Row icon={User} label="آرایشگر" value={booking.barber?.name || 'نامشخص'} />
            <Row icon={Calendar} label="تاریخ" value={formatJalaliDate(booking.date, { weekday: 'long', day: 'numeric', month: 'long' })} />
            <Row icon={Clock} label="ساعت" value={toPersianDigits(booking.timeSlot)} />
            <Row label="کد رهگیری" value={booking.code} mono />

            {booking.status !== 'cancelled' && (
              <Button variant="danger" className="w-full mt-2" loading={cancelling} onClick={onCancel}>
                <XCircle className="w-4 h-4" />
                لغو این نوبت
              </Button>
            )}
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
