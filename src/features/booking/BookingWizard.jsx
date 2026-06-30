'use client';

import { useState, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Sparkles, Check, AlertCircle, ArrowRight, ArrowLeft, Loader2, Star,
} from 'lucide-react';
import { formatPrice, toPersianDigits, formatJalaliDate, isValidIranMobile } from '@/lib/persian';
import { jsDayToPersianIndex } from '@/lib/availability';
import { useAvailability, useCreateBooking } from '@/api/bookings';
import { useBookingStore } from './store';
import JalaliDatePicker from '@/components/ui/JalaliDatePicker';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import { cn } from '@/lib/utils';

const contactSchema = z.object({
  customerName: z.string().trim().min(1, 'نام و نام خانوادگی الزامی است.'),
  customerPhone: z.string().refine(isValidIranMobile, 'شماره موبایل باید ۱۱ رقمی و با ۰۹ شروع شود.'),
});

export default function BookingWizard({ services, barbers, onClose }) {
  const presetService = useBookingStore((s) => s.selectedServiceId);
  const presetBarber = useBookingStore((s) => s.selectedBarberId);

  const [serviceIds, setServiceIds] = useState(presetService ? [presetService] : []);
  const [barberId, setBarberId] = useState(presetBarber || null);
  const [step, setStep] = useState(presetService ? 2 : 1);
  const [dateIso, setDateIso] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [success, setSuccess] = useState(null);

  const activeServices = services.filter((s) => serviceIds.includes(s.id));
  const totalPrice = activeServices.reduce((sum, s) => sum + s.price, 0);
  const activeBarber = barbers.find((b) => b.id === barberId);

  // انتخاب/لغو خدمت با سقف دو خدمت.
  const toggleService = (id) =>
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? prev : [...prev, id]
    );

  const createBooking = useCreateBooking();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { customerName: '', customerPhone: '' },
  });

  // اسلات‌های آزاد (فقط در مرحله‌ی ۳ و وقتی روز انتخاب شده)
  // مدت‌زمان کل (مجموع خدمت‌ها) با چند شناسه‌ی جداشده با کاما به سرور می‌رود.
  const { data: avail, isLoading: loadingSlots } = useAvailability(
    barberId, dateIso, serviceIds.join(','), step === 3 && Boolean(dateIso)
  );

  const isDayDisabled = (jsDate) =>
    activeBarber ? !activeBarber.workDays.includes(jsDayToPersianIndex(jsDate.getDay())) : false;

  const canNext =
    (step === 1 && serviceIds.length >= 1) ||
    (step === 2 && barberId) ||
    (step === 3 && dateIso && timeSlot && !avail?.dayOff);

  const goNext = () => { if (canNext && step < 4) setStep(step + 1); };
  const goPrev = () => { if (step > 1) setStep(step - 1); };

  const onConfirm = async (form) => {
    try {
      const booking = await createBooking.mutateAsync({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        serviceId: serviceIds[0],
        serviceId2: serviceIds[1] || null,
        barberId,
        date: dateIso,
        timeSlot,
      });
      setSuccess(booking);
      setStep(5);
      toast.success('نوبت شما با موفقیت ثبت شد!');
    } catch (e) {
      toast.error(e.message);
      if (e.status === 409) setStep(3); // اسلات اشغال شده → بازگشت به انتخاب زمان
    }
  };

  return (
    <div className="flex flex-col">
      {/* سربرگ و نوار مراحل */}
      <div className="p-6 md:p-8 border-b border-zinc-900 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-500 mb-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold tracking-wider uppercase">سیستم رزرو هوشمند رویال</span>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white">
          {step === 1 && 'انتخاب خدمت آرایشی'}
          {step === 2 && 'انتخاب آرایشگر متخصص'}
          {step === 3 && 'انتخاب روز و ساعت حضور'}
          {step === 4 && 'تایید نهایی و اطلاعات تماس'}
          {step === 5 && 'رزرو شما با موفقیت ثبت شد'}
        </h2>

        {step < 5 && (
          <div className="flex items-center mt-6 w-full max-w-md mx-auto">
            {[1, 2, 3, 4].map((num) => (
              <Fragment key={num}>
                <div className={cn(
                  'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step >= num ? 'bg-amber-500 text-black font-extrabold shadow-lg shadow-amber-500/10' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                )}>
                  {toPersianDigits(num)}
                </div>
                {num < 4 && <div className={cn('flex-1 h-0.5 mx-2 rounded transition-all', step > num ? 'bg-amber-500' : 'bg-zinc-900')} />}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* مرحله ۱: خدمت (تا دو خدمت قابل انتخاب) */}
      {step === 1 && (
        <div className="p-6 md:p-8">
          <p className="text-zinc-400 text-xs md:text-sm mb-4 text-center">
            می‌توانید تا <span className="text-amber-400 font-bold">۲ خدمت</span> انتخاب کنید:
          </p>
          <div className="grid grid-cols-1 gap-3">
            {services.map((service) => {
              const selected = serviceIds.includes(service.id);
              const disabled = !selected && serviceIds.length >= 2;
              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.id)}
                  disabled={disabled}
                  className={cn(
                    'w-full text-right p-4 rounded-2xl border transition-all flex items-center gap-3 group',
                    selected
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : disabled
                      ? 'bg-zinc-900/20 border-zinc-900 text-zinc-600 opacity-50 cursor-not-allowed'
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
                    <span className="text-zinc-500 text-[10px] block mt-1">{toPersianDigits(service.duration)} دقیقه</span>
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

      {/* مرحله ۲: آرایشگر */}
      {step === 2 && (
        <div className="p-6 md:p-8">
          <p className="text-zinc-400 text-xs md:text-sm mb-4">آرایشگر مورد نظر خود را انتخاب نمایید:</p>
          <div className="grid grid-cols-1 gap-3">
            {barbers.map((barber) => (
              <button
                key={barber.id}
                onClick={() => { setBarberId(barber.id); setDateIso(''); setTimeSlot(''); setStep(3); }}
                className={cn(
                  'w-full text-right p-4 rounded-2xl border transition-all flex items-center gap-4 group',
                  barberId === barber.id ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 text-zinc-300'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={barber.avatar} alt={barber.name} className="w-12 h-12 rounded-xl object-cover border border-zinc-800" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm md:text-base group-hover:text-amber-400 transition-colors">{barber.name}</h4>
                  <p className="text-zinc-500 text-xs mt-0.5">{barber.specialty}</p>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-800 text-xs text-zinc-200">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>{toPersianDigits(barber.rating)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* مرحله ۳: روز و ساعت */}
      {step === 3 && (
        <div className="p-6 md:p-8">
          <p className="text-zinc-400 text-xs md:text-sm mb-3 text-center">ابتدا یک روز را برای حضور انتخاب کنید (روزهای مرخصی غیرفعال‌اند):</p>
          <div className="max-w-xs mx-auto">
            <JalaliDatePicker value={dateIso} onChange={(iso) => { setDateIso(iso); setTimeSlot(''); }} isDisabled={isDayDisabled} />
          </div>

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
                  <span>{activeBarber?.name} در روز انتخاب‌شده مرخصی است. لطفاً روز دیگری را برگزینید.</span>
                </div>
              ) : (
                <>
                  <p className="text-zinc-400 text-xs md:text-sm mb-4">ساعت حضور را مشخص کنید:</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {avail?.slots?.map((slot) => (
                      <button
                        key={slot.time}
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
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* مرحله ۴: اطلاعات تماس */}
      {step === 4 && (
        <div className="p-6 md:p-8">
          <div className="bg-zinc-900/60 border border-zinc-900 p-4 rounded-2xl mb-6">
            <h3 className="text-xs font-extrabold text-amber-500 mb-3 uppercase tracking-wider">خلاصه رزرو نوبت شما:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-300">
              <div className="flex items-center gap-2"><span className="text-zinc-500">خدمت:</span><span className="font-bold text-white">{activeServices.map((s) => s.name).join(' + ')}</span></div>
              <div className="flex items-center gap-2"><span className="text-zinc-500">مبلغ:</span><span className="font-extrabold text-amber-500">{formatPrice(totalPrice)}</span></div>
              <div className="flex items-center gap-2"><span className="text-zinc-500">آرایشگر:</span><span className="font-bold text-white">{activeBarber?.name}</span></div>
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
              * با تایید نهایی، نوبت شما به‌صورت موقت ثبت شده و پس از بررسی آرایشگر تایید می‌شود. پرداخت در آرایشگاه انجام می‌گیرد.
            </div>
          </form>
        </div>
      )}

      {/* مرحله ۵: موفقیت */}
      {step === 5 && success && (
        <div className="p-8 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-500 rounded-full flex items-center justify-center mb-6">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-extrabold text-white mb-2">نوبت شما با موفقیت رزرو شد!</h3>
          <p className="text-zinc-400 text-xs md:text-sm max-w-md leading-relaxed mb-8">
            رزرو شما برای <span className="text-white font-bold">{activeBarber?.name}</span> جهت <span className="text-white font-bold">{activeServices.map((s) => s.name).join(' + ')}</span> در{' '}
            <span className="text-white font-bold">{formatJalaliDate(dateIso, { weekday: 'long', day: 'numeric', month: 'long' })}</span> ساعت{' '}
            <span className="text-white font-bold">{toPersianDigits(timeSlot)}</span> ثبت شد.
          </p>

          <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl w-full max-w-md mb-8 text-xs text-zinc-300 text-right space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">کد رهگیری نوبت:</span>
              <span className="font-mono font-bold text-amber-500 text-sm">{success.code}</span>
            </div>
            <div className="flex items-center justify-between"><span className="text-zinc-500">مشتری:</span><span className="font-bold text-white">{success.customerName}</span></div>
            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
              <span className="text-zinc-500">وضعیت:</span>
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full font-bold text-[10px] border border-amber-500/20">در انتظار تایید آرایشگر</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500 mb-6">کد رهگیری را یادداشت کنید؛ با آن می‌توانید از صفحه‌ی «رهگیری نوبت» وضعیت را ببینید یا نوبت را لغو کنید.</p>
          <Button variant="secondary" size="lg" onClick={onClose}>متوجه شدم</Button>
        </div>
      )}

      {/* فوتر ناوبری */}
      {step < 5 && (
        <div className="p-6 md:p-8 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={goPrev}>
              <ArrowRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </Button>
          ) : <div />}

          {step < 4 ? (
            <Button onClick={goNext} disabled={!canNext}>
              <span>مرحله بعد</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="submit" form="booking-contact-form" loading={createBooking.isPending}>
              ثبت نهایی و رزرو نوبت
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
