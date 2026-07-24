'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Search, Scissors, User, Scissors as ScissorsIcon, XCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { lookupSchema } from '@/lib/validation';
import { lookupBooking, requestCancelOtp, cancelBooking } from '@/api/bookings';
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
  // نوبتی که در حالِ لغو است و منتظرِ کدِ تأیید می‌ماند: { code, phoneMasked } یا null.
  const [otpFor, setOtpFor] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [sendingCode, setSendingCode] = useState(null); // کدِ نوبتی که در حالِ ارسال/ارسالِ مجددِ کدِ تأیید است
  const [cancelling, setCancelling] = useState(false); // در حالِ لغوِ نهایی

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(lookupSchema),
    defaultValues: { phone: '' },
  });

  const refreshList = async () => {
    const refreshed = await lookupBooking({ phone: getValues('phone') });
    setBookings(Array.isArray(refreshed) ? refreshed : [refreshed]);
  };

  const onSubmit = async (data) => {
    setOtpFor(null);
    try {
      const result = await lookupBooking(data);
      setBookings(Array.isArray(result) ? result : [result]);
    } catch (e) {
      setBookings([]);
      toast.error(e.message);
    }
  };

  // ارسال/ارسالِ مجددِ کدِ تأیید (بدونِ دیالوگِ تأیید).
  const sendOtp = async (code) => {
    setSendingCode(code);
    try {
      const res = await requestCancelOtp({ code });
      setOtpFor({ code, phoneMasked: res?.phoneMasked || '' });
      setOtpValue('');
      toast.success('کد تأیید ارسال شد.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSendingCode(null);
    }
  };

  // گامِ ۱ لغو: تأیید + درخواستِ کدِ دومرحله‌ای.
  const onRequestCancel = async (code) => {
    const ok = await confirm({
      title: 'لغو نوبت',
      description: 'برای لغو، یک کد تأیید به موبایلِ ثبت‌شده‌ی شما ارسال می‌شود. ادامه می‌دهید؟',
      confirmText: 'ارسال کد تأیید',
      cancelText: 'انصراف',
      danger: true,
    });
    if (ok) await sendOtp(code);
  };

  // گامِ ۲ لغو: ارسالِ کد + OTP.
  const onConfirmCancel = async () => {
    if (!otpFor) return;
    setCancelling(true);
    try {
      await cancelBooking({ code: otpFor.code, otp: otpValue });
      setOtpFor(null);
      setOtpValue('');
      await refreshList();
      toast.success('نوبت شما لغو شد.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancelling(false);
    }
  };

  // نوبتی که در حالِ لغو است (برای نمایشِ زمان در صفحه‌ی تأیید).
  const cancelTarget = otpFor ? bookings?.find((b) => b.code === otpFor.code) : null;

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

        {/* حالتِ ۱ — تأیید لغو: صفحه فقط کدِ ۶ رقمی را نشان می‌دهد */}
        {otpFor ? (
          <div className="glass p-8 rounded-3xl border border-amber-500/20">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-extrabold text-white">تأیید لغو نوبت</h1>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                کد تأیید به شماره‌ی{' '}
                {otpFor.phoneMasked
                  ? <span dir="ltr" className="font-mono text-zinc-200">{otpFor.phoneMasked}</span>
                  : 'موبایلِ شما'}{' '}
                ارسال شد. کد ۶ رقمی را وارد کنید:
              </p>
              {cancelTarget && (
                <p className="text-[11px] text-amber-400/80 mt-2">
                  نوبتِ {formatJalaliDate(cancelTarget.date, { day: 'numeric', month: 'long' })} — ساعت {toPersianDigits(cancelTarget.timeSlot)}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder="------"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                style={{ direction: 'ltr', textAlign: 'center', letterSpacing: '0.6em', fontSize: '1.25rem' }}
              />
              <Button variant="danger" className="w-full" size="lg" loading={cancelling} disabled={otpValue.length < 6} onClick={onConfirmCancel}>
                تأیید و لغو نوبت
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setOtpFor(null); setOtpValue(''); }}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  ← بازگشت
                </button>
                <button
                  type="button"
                  onClick={() => sendOtp(otpFor.code)}
                  disabled={sendingCode === otpFor.code}
                  className="text-[11px] text-zinc-500 hover:text-amber-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {sendingCode === otpFor.code && <Loader2 className="w-3 h-3 animate-spin" />}
                  ارسال دوباره‌ی کد
                </button>
              </div>
            </div>
          </div>
        ) : bookings ? (
          /* حالتِ ۲ — نتیجه‌ی رهگیری: فقط نوبت‌ها (بدونِ فرمِ جست‌وجو) */
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="glass p-8 rounded-3xl border border-zinc-800 text-center">
                <p className="text-sm text-zinc-300 font-bold">نوبتی با این شماره یافت نشد.</p>
                <p className="text-xs text-zinc-500 mt-1">شماره را بررسی کنید و دوباره جست‌وجو کنید.</p>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.code} className="glass p-5 rounded-3xl border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-amber-500">{booking.code}</span>
                    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold border', STATUS_STYLES[booking.status])}>
                      {STATUS_LABELS[booking.status]}
                    </span>
                  </div>

                  <p className="text-base font-extrabold text-amber-400">
                    {formatJalaliDate(booking.date, { weekday: 'long', day: 'numeric', month: 'long' })} — ساعت {toPersianDigits(booking.timeSlot)}
                  </p>

                  <div className="space-y-2 border-t border-zinc-900 pt-3">
                    <Row icon={ScissorsIcon} label="خدمت" value={servicesLabelOf(booking)} />
                    <Row icon={User} label="مشتری" value={booking.customerName} />
                    {booking.refundAmount > 0 && (
                      <Row icon={ScissorsIcon} label="مبلغ بازگشتی" value={formatPrice(booking.refundAmount)} />
                    )}
                  </div>

                  {booking.status !== 'cancelled' && (
                    <Button
                      variant="danger"
                      className="w-full"
                      loading={sendingCode === booking.code}
                      onClick={() => onRequestCancel(booking.code)}
                    >
                      <XCircle className="w-4 h-4" />
                      لغو این نوبت
                    </Button>
                  )}
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => setBookings(null)}
              className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-2"
            >
              رهگیریِ شماره‌ی دیگر
            </button>
          </div>
        ) : (
          /* حالتِ ۳ — جست‌وجو */
          <div className="glass p-8 rounded-3xl border border-zinc-800">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-extrabold text-white">رهگیری نوبت</h1>
              <p className="text-xs text-zinc-400 mt-1">شماره موبایلی که هنگام رزرو وارد کردید را بنویسید تا نوبت‌تان را ببینید.</p>
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
        )}

        {/* بازگشت به صفحه‌ی اصلی — همیشه در دسترس */}
        <Link href="/" className="block text-center text-xs text-zinc-500 hover:text-amber-400 mt-6 transition-colors">
          ← بازگشت به صفحه‌ی اصلی
        </Link>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-amber-500" />}
        {label}:
      </span>
      <span className="font-bold text-white">{value}</span>
    </div>
  );
}
