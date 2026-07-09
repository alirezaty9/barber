'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useServices } from '@/api/services';
import { useBarbers } from '@/api/barbers';
import { useAvailability, useCreateBooking } from '@/api/bookings';
import { isValidIranMobile, toPersianDigits, formatPrice } from '@/lib/persian';
import { jsDayToPersianIndex } from '@/lib/availability';
import Select from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import JalaliDatePicker from '@/components/ui/JalaliDatePicker';
import { cn } from '@/lib/utils';

const schema = z.object({
  customerName: z.string().trim().min(1, 'نام مشتری الزامی است.'),
  customerPhone: z.string().refine(isValidIranMobile, 'شماره موبایل نامعتبر است.'),
});

export default function ManualBooking() {
  const { data: services = [] } = useServices();
  const { data: barbers = [] } = useBarbers();
  const createBooking = useCreateBooking();

  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [dateIso, setDateIso] = useState('');
  const [timeSlot, setTimeSlot] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { customerName: '', customerPhone: '' },
  });

  const activeBarber = barbers.find((b) => b.id === barberId);
  const { data: avail, isLoading: loadingSlots } = useAvailability(barberId, dateIso, serviceId, Boolean(barberId && dateIso));

  const isDayDisabled = (jsDate) =>
    activeBarber ? !activeBarber.workDays.includes(jsDayToPersianIndex(jsDate.getDay())) : false;

  const onSubmit = async (form) => {
    if (!serviceId || !barberId || !dateIso || !timeSlot) {
      toast.error('لطفاً خدمت، آرایشگر، تاریخ و ساعت را انتخاب کنید.');
      return;
    }
    try {
      await createBooking.mutateAsync({ ...form, serviceId, barberId, date: dateIso, timeSlot });
      toast.success('نوبت با موفقیت ثبت و تایید شد.');
      reset();
      setServiceId(''); setBarberId(''); setDateIso(''); setTimeSlot('');
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="خدمت:">
            <Select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTimeSlot(''); }}>
              <option value="">-- انتخاب خدمت --</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({formatPrice(s.price)})</option>)}
            </Select>
          </Field>
          <Field label="آرایشگر:">
            <Select value={barberId} onChange={(e) => { setBarberId(e.target.value); setDateIso(''); setTimeSlot(''); }}>
              <option value="">-- انتخاب آرایشگر --</option>
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        </div>

        <Field label="تاریخ حضور:">
          <JalaliDatePicker value={dateIso} onChange={(iso) => { setDateIso(iso); setTimeSlot(''); }} isDisabled={isDayDisabled} minDate={new Date()} />
        </Field>

        {barberId && dateIso && (
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
