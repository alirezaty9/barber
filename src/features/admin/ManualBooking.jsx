'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlusCircle, Loader2, Check } from 'lucide-react';
import { useServices } from '@/api/services';
import { useBarbers } from '@/api/barbers';
import { useAvailability, useCreateBooking } from '@/api/bookings';
import { isValidIranMobile, toPersianDigits, formatPrice } from '@/lib/persian';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import DayPicker from '@/components/ui/DayPicker';
import { cn } from '@/lib/utils';

const schema = z.object({
  customerName: z.string().trim().min(1, 'نام مشتری الزامی است.'),
  customerPhone: z.string().refine(isValidIranMobile, 'شماره موبایل نامعتبر است.'),
});

export default function ManualBooking() {
  const { data: services = [] } = useServices();
  const { data: barbers = [] } = useBarbers();
  const createBooking = useCreateBooking();

  const [serviceIds, setServiceIds] = useState([]);
  const [dateIso, setDateIso] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  // پروژه تک‌آرایشگره است؛ آرایشگر خودکار همان تنها آرایشگر است (بدون انتخاب).
  const activeBarber = barbers[0];
  const barberId = activeBarber?.id || '';

  // انتخاب/لغو خدمت — بدون محدودیت تعداد.
  const toggleService = (id) => {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setTimeSlot('');
  };
  const totalPrice = services.filter((s) => serviceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { customerName: '', customerPhone: '' },
  });
  const { data: avail, isLoading: loadingSlots } = useAvailability(
    barberId, dateIso, serviceIds.join(','), Boolean(barberId && dateIso && serviceIds.length)
  );

  const onSubmit = async (form) => {
    if (!serviceIds.length || !barberId || !dateIso || !timeSlot) {
      toast.error('لطفاً حداقل یک خدمت، تاریخ و ساعت را انتخاب کنید.');
      return;
    }
    try {
      await createBooking.mutateAsync({ ...form, serviceIds, barberId, date: dateIso, timeSlot });
      toast.success('نوبت با موفقیت ثبت و تایید شد.');
      reset();
      setServiceIds([]); setDateIso(''); setTimeSlot('');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-amber-500" /> ثبت نوبت دستی
        </h2>
        <p className="text-xs text-zinc-400 mt-1">برای مشتریان تلفنی یا حضوری — نوبت مستقیماً «تایید شده» ثبت می‌شود.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="glass p-6 md:p-8 rounded-3xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="نام مشتری:" error={errors.customerName?.message}>
            <Input placeholder="مثال: پوریا رسولی" error={errors.customerName} {...register('customerName')} />
          </Field>
          <Field label="شماره موبایل:" error={errors.customerPhone?.message}>
            <Input type="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" style={{ direction: 'ltr', textAlign: 'left' }} error={errors.customerPhone} {...register('customerPhone')} />
          </Field>
        </div>

        <Field label="خدمت (می‌توانید چند مورد انتخاب کنید):">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {services.map((s) => {
              const selected = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-xl border text-right transition-all',
                    selected ? 'bg-amber-500/10 border-amber-500/40 text-white' : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  )}
                >
                  <span className={cn('w-5 h-5 shrink-0 rounded-md border flex items-center justify-center', selected ? 'bg-amber-500 border-amber-500 text-black' : 'border-zinc-600')}>
                    {selected && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="flex-1 text-xs font-bold">{s.name}</span>
                  <span className="text-[11px] text-amber-500 font-extrabold whitespace-nowrap">{formatPrice(s.price)}</span>
                </button>
              );
            })}
          </div>
          {serviceIds.length > 0 && (
            <div className="mt-2 text-xs text-zinc-400 text-left">جمع: <span className="text-amber-500 font-extrabold">{formatPrice(totalPrice)}</span></div>
          )}
        </Field>

        <Field label="تاریخ حضور:">
          <DayPicker value={dateIso} onChange={(iso) => { setDateIso(iso); setTimeSlot(''); }} days={14} />
        </Field>

        {barberId && dateIso && serviceIds.length > 0 && (
          <Field label="ساعت حضور:">
            {loadingSlots ? (
              <div className="flex items-center gap-2 text-zinc-500 text-xs py-2"><Loader2 className="w-4 h-4 animate-spin" /> بررسی ساعات...</div>
            ) : avail?.dayOff ? (
              <p className="text-red-400 text-xs">آرایشگر این روز مرخصی است.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {avail?.slots?.map((slot) => (
                  <button
                    type="button"
                    key={slot.time}
                    disabled={!slot.available}
                    onClick={() => setTimeSlot(slot.time)}
                    className={cn(
                      'py-2 rounded-lg text-xs font-bold border transition-all',
                      timeSlot === slot.time ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : slot.available ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        : 'bg-red-950/20 border-red-950 text-red-500 opacity-60 line-through cursor-not-allowed'
                    )}
                  >
                    {toPersianDigits(slot.time)}
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" loading={createBooking.isPending}>
          ثبت رسمی نوبت
        </Button>
      </form>
    </div>
  );
}
