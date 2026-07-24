'use client';

import { useState, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Sparkles, Check, AlertCircle, ArrowRight, ArrowLeft, Loader2,
} from 'lucide-react';
import { formatPrice, toPersianDigits, formatJalaliDate, isValidIranMobile } from '@/lib/persian';
import { useAvailability, useRequestPayment } from '@/api/bookings';
import { useBookingStore } from './store';
import DayPicker from '@/components/ui/DayPicker';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import { cn } from '@/lib/utils';

const contactSchema = z.object({
  customerName: z.string().trim().min(1, 'نام و نام خانوادگی الزامی است.'),
  customerPhone: z.string().refine(isValidIranMobile, 'شماره موبایل باید ۱۱ رقمی و با ۰۹ شروع شود.'),
});

// ویزارد رزرو ۳ مرحله‌ای (تک‌آرایشگر): ۱) خدمت، ۲) روز و ساعت، ۳) اطلاعات تماس و پرداخت.
// آرایشگر ثابت است و توسط مشتری انتخاب نمی‌شود؛ اولین (و تنها) آرایشگرِ سیستم استفاده می‌شود.
export default function BookingWizard({ services, barbers, onClose }) {
  const presetService = useBookingStore((s) => s.selectedServiceId);

  // تنها آرایشگرِ مجموعه.
  const activeBarber = barbers[0];
  const barberId = activeBarber?.id || null;

  const [serviceIds, setServiceIds] = useState(presetService ? [presetService] : []);
  // همیشه از مرحله‌ی اول (انتخاب خدمت) شروع می‌کنیم؛ اگر خدمتی از قبل کلیک شده باشد
  // فقط همان از پیش تیک می‌خورد و کاربر می‌تواند خدمات بیشتری اضافه کند.
  const [step, setStep] = useState(1);
  const [dateIso, setDateIso] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  const activeServices = services.filter((s) => serviceIds.includes(s.id));
  const totalPrice = activeServices.reduce((sum, s) => sum + s.price, 0);

  // انتخاب/لغو خدمت — بدون محدودیت تعداد.
  const toggleService = (id) =>
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const requestPayment = useRequestPayment();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { customerName: '', customerPhone: '' },
  });

  // اسلات‌های آزاد (فقط در مرحله‌ی ۲ و وقتی روز انتخاب شده).
  // موجودی مستقل از خدماتِ انتخابی است، پس تغییرِ خدمت باعثِ واکشیِ دوباره نمی‌شود.
  const { data: avail, isLoading: loadingSlots } = useAvailability(
    barberId, dateIso, step === 2 && Boolean(dateIso)
  );

  const canNext =
    (step === 1 && serviceIds.length >= 1) ||
    (step === 2 && dateIso && timeSlot && !avail?.dayOff);

  const goNext = () => { if (canNext && step < 3) setStep(step + 1); };
  const goPrev = () => { if (step > 1) setStep(step - 1); };

  const onConfirm = async (form) => {
    try {
      const { paymentUrl } = await requestPayment.mutateAsync({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        serviceIds,
        barberId,
        date: dateIso,
        timeSlot,
      });
      toast.success('در حال انتقال به درگاه پرداخت...');
      // انتقال به درگاه زرین‌پال؛ نتیجه در صفحه‌ی /payment/result نمایش داده می‌شود.
      window.location.href = paymentUrl;
    } catch (e) {
      toast.error(e.message);
      if (e.status === 409) setStep(2); // اسلات اشغال شده → بازگشت به انتخاب زمان
    }
  };

  return (
    <div className="flex flex-col">
      {/* سربرگ و نوار مراحل */}
      <div className="p-6 md:p-8 border-b border-zinc-900 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold tracking-wider uppercase">سیستم رزرو هوشمند banad barber</span>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white">
          {step === 1 && 'انتخاب خدمت آرایشی'}
          {step === 2 && 'انتخاب روز و ساعت حضور'}
          {step === 3 && 'تایید نهایی و پرداخت'}
        </h2>

        <div className="flex items-center mt-6 w-full max-w-sm mx-auto">
          {[1, 2, 3].map((num) => (
            <Fragment key={num}>
              <div className={cn(
                'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                step >= num ? 'bg-amber-500 text-black font-extrabold shadow-lg shadow-amber-500/10' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              )}>
                {toPersianDigits(num)}
              </div>
              {num < 3 && <div className={cn('flex-1 h-0.5 mx-2 rounded transition-all', step > num ? 'bg-amber-500' : 'bg-zinc-900')} />}
            </Fragment>
          ))}
        </div>
      </div>

      {/* مرحله ۱: خدمت (تا دو خدمت قابل انتخاب) */}
      {step === 1 && (
        <div className="p-6 md:p-8">
          <p className="text-zinc-400 text-xs md:text-sm mb-4 text-center">
            می‌توانید <span className="text-amber-400 font-bold">یک یا چند خدمت</span> انتخاب کنید:
          </p>
          <div className="grid grid-cols-1 gap-3">
            {services.map((service) => {
              const selected = serviceIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleService(service.id)}
                  className={cn(
                    'w-full text-right p-4 rounded-2xl border transition-all flex items-center gap-3 group',
                    selected
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 shrink-0 rounded-md border flex items-center justify-center transition-all',
                    selected ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-700'
                  )}>
                    {selected && <Check className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm md:text-base group-hover:text-amber-400 transition-colors">{service.name}</h4>
                    <p className="text-zinc-500 text-xs mt-1 leading-relaxed line-clamp-1">{service.description}</p>
                  </div>
                  <div className="text-left">
                    <div className="text-amber-500 font-extrabold text-sm whitespace-nowrap">{formatPrice(service.price)}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {serviceIds.length > 0 && (
            <div className="mt-4 flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-xs">
              <span className="text-zinc-400">{toPersianDigits(serviceIds.length)} خدمت انتخاب شد</span>
              <span className="text-amber-500 font-extrabold">جمع: {formatPrice(totalPrice)}</span>
            </div>
          )}
        </div>
      )}

      {/* مرحله ۲: روز و ساعت */}
      {step === 2 && (
        <div className="p-6 md:p-8">
          <p className="text-zinc-400 text-xs md:text-sm mb-3 text-center">یک روز را برای حضور انتخاب کنید (تا یک هفته‌ی آینده):</p>
          <DayPicker value={dateIso} onChange={(iso) => { setDateIso(iso); setTimeSlot(''); }} days={8} />

          {dateIso && (
            <div className="mt-6">
              {loadingSlots ? (
                <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs py-8">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال بررسی ساعات آزاد...</span>
                </div>
              ) : avail?.dayOff ? (
                <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>در روز انتخاب‌شده امکان رزرو نیست. لطفاً روز دیگری را برگزینید.</span>
                </div>
              ) : (
                <>
                  <p className="text-zinc-400 text-xs md:text-sm mb-4">ساعت حضور را مشخص کنید:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {avail?.slots?.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        aria-pressed={timeSlot === slot.time}
                        disabled={!slot.available}
                        onClick={() => setTimeSlot(slot.time)}
                        className={cn(
                          'py-3 rounded-xl text-xs font-bold transition-all border',
                          timeSlot === slot.time
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-extrabold'
                            : slot.available
                            ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            : 'bg-red-950/20 border-red-950 text-red-500 opacity-60 line-through cursor-not-allowed'
                        )}
                      >
                        {toPersianDigits(slot.time)}
                        {!slot.available && slot.reason === 'booked' && (
                          <span className="block text-[8px] font-medium text-red-400 mt-0.5">رزرو شده</span>
                        )}
                        {!slot.available && slot.reason === 'past' && (
                          <span className="block text-[8px] font-medium text-zinc-500 mt-0.5">گذشته</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* مرحله ۳: اطلاعات تماس و پرداخت */}
      {step === 3 && (
        <div className="p-6 md:p-8">
          <div className="bg-zinc-900/60 border border-zinc-900 p-4 rounded-2xl mb-6">
            <h3 className="text-xs font-extrabold text-amber-500 mb-3 uppercase tracking-wider">خلاصه رزرو نوبت شما:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-300">
              <div className="flex items-center gap-2"><span className="text-zinc-500">خدمت:</span><span className="font-bold text-white">{activeServices.map((s) => s.name).join(' + ')}</span></div>
              <div className="flex items-center gap-2"><span className="text-zinc-500">مبلغ قابل پرداخت:</span><span className="font-extrabold text-amber-500">{formatPrice(totalPrice)}</span></div>
              <div className="flex items-center gap-2"><span className="text-zinc-500">زمان:</span><span className="font-bold text-white">{formatJalaliDate(dateIso, { weekday: 'long', day: 'numeric', month: 'long' })} - ساعت {toPersianDigits(timeSlot)}</span></div>
            </div>
          </div>

          <form id="booking-contact-form" onSubmit={handleSubmit(onConfirm)} className="space-y-4">
            <Field label="نام و نام خانوادگی:" error={errors.customerName?.message}>
              <Input placeholder="مثال: رضا محمدی" error={errors.customerName} {...register('customerName')} />
            </Field>
            <Field label="شماره موبایل (جهت اطلاع‌رسانی):" error={errors.customerPhone?.message}>
              <Input type="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" style={{ direction: 'ltr', textAlign: 'left' }} error={errors.customerPhone} {...register('customerPhone')} />
            </Field>
            <div className="p-3.5 bg-zinc-950 border border-zinc-900 rounded-xl text-[11px] text-zinc-500 leading-relaxed">
              * با کلیک روی «پرداخت و رزرو نوبت» به درگاه امن پرداخت منتقل می‌شوید. پس از پرداخت، نوبت شما ثبت و پس از تایید آرایشگر قطعی می‌شود.
              <br />
              <span className="text-amber-400/90">توجه: در صورت لغو نوبت، ۵۰٪ مبلغ پرداختی به شما بازگردانده می‌شود.</span>
            </div>
          </form>
        </div>
      )}

      {/* فوتر ناوبری */}
      <div className="p-6 md:p-8 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between">
        {step > 1 ? (
          <Button variant="outline" size="sm" onClick={goPrev}>
            <ArrowRight className="w-4 h-4" />
            <span>مرحله قبل</span>
          </Button>
        ) : <div />}

        {step < 3 ? (
          <Button onClick={goNext} disabled={!canNext}>
            <span>مرحله بعد</span>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        ) : (
          <Button type="submit" form="booking-contact-form" loading={requestPayment.isPending}>
            پرداخت و رزرو نوبت
          </Button>
        )}
      </div>
    </div>
  );
}
