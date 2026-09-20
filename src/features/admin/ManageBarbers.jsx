'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { User, Pencil } from 'lucide-react';
import { barberSchema } from '@/lib/validation';
import { useBarbers, useUpdateBarber } from '@/api/barbers';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import ErrorState from '@/components/ui/ErrorState';
import { cn } from '@/lib/utils';

// روزهای کاری آرایه است و با react-hook-form ثبت نمی‌شود؛ پس از فرم کنار گذاشته می‌شود.
const formSchema = barberSchema.omit({ workDays: true });

// ۰=شنبه … ۶=جمعه — همان قراردادی که سرور و محاسبه‌ی موجودی با آن کار می‌کنند.
// ⚠️ املا عمداً دقیقاً همان چیزی است که مشتری در صفحه‌ی رزرو و رهگیری می‌بیند
// («یکشنبه» و «پنجشنبه» بدونِ نیم‌فاصله). قبلاً پنل و صفحه‌ی مشتری یک روز را دو جور
// می‌نوشتند؛ همان روز بود، ولی خواننده شک می‌کرد نکند دو چیزِ متفاوت باشند.
const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// پروژه تک‌آرایشگره است: این بخش فقط تنظیماتِ همان یک آرایشگر را ویرایش می‌کند.
//
// 🧹 پاک‌سازیِ ۱۴۰۵/۰۶/۲۸: فیلدهای «تخصص»، «آواتار»، «عکسِ بزرگ»، «امتیاز» و «بیوگرافی»
// حذف شدند. این‌ها بازمانده‌ی نسخه‌ی چندآرایشگره بودند: در این فرم پر می‌شدند ولی
// **هیچ صفحه‌ای در کلِ سایت نمایششان نمی‌داد** — یعنی وقتِ پرکردنشان دورریز بود.
// حالا فقط چیزی در فرم است که واقعاً اثر دارد: نام، و روزهای کاریِ هفته.
export default function ManageBarbers() {
  const { data: barbers = [], isError, error, refetch } = useBarbers();
  const barber = barbers[0];
  const updateBarber = useUpdateBarber();
  const [workDays, setWorkDays] = useState([0, 1, 2, 3, 4, 5, 6]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  // وقتی داده‌ی آرایشگر رسید، فرم را با مقادیرش پر کن.
  useEffect(() => {
    if (!barber) return;
    reset({ name: barber.name });
    // آرایه‌ی خالی یعنی «پیکربندی‌نشده» و سرور آن را «همه‌ی روزها کاری» می‌فهمد؛ پس فرم هم
    // باید همان را نشان بدهد، نه هفت دکمه‌ی خاموش (که دقیقاً برعکسِ رفتارِ واقعی بود).
    if (Array.isArray(barber.workDays) && barber.workDays.length) setWorkDays(barber.workDays);
  }, [barber?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDay = (d) =>
    setWorkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

  const onSubmit = async (data) => {
    if (!barber) return;
    // حداقل یک روزِ کاری اجباری است: آرایه‌ی خالی در سمتِ خواندن به «همه‌ی روزها کاری‌اند»
    // تفسیر می‌شود، یعنی دقیقاً برعکسِ چیزی که کاربر انتخاب کرده. سرور هم همین را رد می‌کند.
    if (workDays.length === 0) {
      toast.error('حداقل یک روزِ کاری انتخاب کن.');
      return;
    }
    try {
      await updateBarber.mutateAsync({ id: barber.id, ...data, workDays });
      toast.success('تنظیمات آرایشگر ذخیره شد.');
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  if (!barber) {
    return <p className="text-zinc-500 text-xs text-center py-8">آرایشگری در سیستم ثبت نشده است.</p>;
  }

  return (
    <div className="glass p-6 rounded-3xl">
      <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
        <User className="w-5 h-5 text-amber-500" /> تنظیمات آرایشگر
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="نام:" error={errors.name?.message}>
          <Input placeholder="مثال: استاد بند" error={errors.name} {...register('name')} />
        </Field>

        <Field label="روزهای کاری هفته:">
          <div className="flex flex-wrap gap-1.5">
            {WEEK_DAYS.map((label, d) => {
              const on = workDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border',
                    on
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">
            روزی که خاموش باشد، اصلاً در تقویمِ رزرو دیده نمی‌شود.
          </p>
        </Field>

        <div className="text-[11px] text-zinc-500 leading-relaxed bg-zinc-900/40 border border-zinc-900 rounded-xl p-3">
          برای بستنِ یک تاریخِ مشخص (مرخصی، سفر) یا چند ساعتِ خاص، از تبِ <span className="text-amber-400 font-bold">«مرخصی و بستن ساعت»</span> استفاده کنید.
        </div>

        <Button type="submit" className="w-full" loading={updateBarber.isPending}>
          <Pencil className="w-4 h-4" /> ذخیره تغییرات
        </Button>
      </form>
    </div>
  );
}
