'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { User, Pencil } from 'lucide-react';
import { barberSchema } from '@/lib/validation';
import { useBarbers, useUpdateBarber } from '@/api/barbers';
import { Input, Textarea } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const formSchema = barberSchema.omit({ workDays: true });

// پروژه تک‌آرایشگره است: این بخش فقط «پروفایلِ همان یک آرایشگر» را ویرایش می‌کند
// (بدون افزودن/حذف/لیست).
export default function ManageBarbers() {
  const { data: barbers = [] } = useBarbers();
  const barber = barbers[0];
  const updateBarber = useUpdateBarber();

  const [workDays, setWorkDays] = useState(ALL_DAYS);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', specialty: '', avatar: '', image: '', rating: 5, bio: '' },
  });

  // وقتی داده‌ی آرایشگر رسید، فرم را با مقادیرش پر کن.
  useEffect(() => {
    if (!barber) return;
    setWorkDays(barber.workDays);
    reset({ name: barber.name, specialty: barber.specialty, avatar: barber.avatar, image: barber.image, rating: barber.rating, bio: barber.bio });
  }, [barber?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (d) =>
    setWorkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

  const onSubmit = async (data) => {
    if (!barber) return;
    try {
      await updateBarber.mutateAsync({ id: barber.id, ...data, workDays });
      toast.success('پروفایل آرایشگر ذخیره شد.');
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (!barber) {
    return <p className="text-zinc-500 text-xs text-center py-8">آرایشگری در سیستم ثبت نشده است.</p>;
  }

  return (
    <div className="glass p-6 rounded-3xl">
      <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
        <User className="w-5 h-5 text-amber-500" /> پروفایل آرایشگر
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="نام:" error={errors.name?.message}>
            <Input placeholder="مثال: استاد بند" error={errors.name} {...register('name')} />
          </Field>
          <Field label="تخصص:" error={errors.specialty?.message}>
            <Input placeholder="مثال: هیرکات، ریش و استایل" {...register('specialty')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="آدرس آواتار (URL):" error={errors.avatar?.message}>
            <Input placeholder="https://..." style={{ direction: 'ltr', textAlign: 'left' }} error={errors.avatar} {...register('avatar')} />
          </Field>
          <Field label="آدرس تصویر بزرگ (URL):" error={errors.image?.message}>
            <Input placeholder="https://..." style={{ direction: 'ltr', textAlign: 'left' }} error={errors.image} {...register('image')} />
          </Field>
        </div>

        <Field label="امتیاز (۰ تا ۵):" error={errors.rating?.message}>
          <Input type="number" step="0.1" min="0" max="5" error={errors.rating} {...register('rating')} />
        </Field>

        <Field label="بیوگرافی:" error={errors.bio?.message}>
          <Textarea rows={2} placeholder="توضیح کوتاه درباره‌ی آرایشگر..." {...register('bio')} />
        </Field>

        <Field label="روزهای کاری (سبز: کاری / خاکستری: مرخصی):">
          <div className="flex flex-wrap gap-1.5">
            {ALL_DAYS.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => toggleDay(d)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border',
                  workDays.includes(d)
                    ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                )}
              >
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
        </Field>

        <Button type="submit" className="w-full" loading={updateBarber.isPending}>
          <Pencil className="w-4 h-4" /> ذخیره تغییرات
        </Button>
      </form>
    </div>
  );
}
