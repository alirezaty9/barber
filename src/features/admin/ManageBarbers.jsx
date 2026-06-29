'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { User, Trash2, Pencil, Plus, X } from 'lucide-react';
import { barberSchema } from '@/lib/validation';
import { useBarbers, useCreateBarber, useUpdateBarber, useDeleteBarber } from '@/api/barbers';
import { toPersianDigits } from '@/lib/persian';
import { confirm } from '@/components/ui/confirm';
import { Input, Textarea } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const EMPTY = { name: '', specialty: '', avatar: '', image: '', rating: 5, bio: '' };

const formSchema = barberSchema.omit({ workDays: true });

export default function ManageBarbers() {
  const { data: barbers = [] } = useBarbers();
  const createBarber = useCreateBarber();
  const updateBarber = useUpdateBarber();
  const deleteBarber = useDeleteBarber();

  const [editingId, setEditingId] = useState(null);
  const [workDays, setWorkDays] = useState(ALL_DAYS);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  const startEdit = (b) => {
    setEditingId(b.id);
    setWorkDays(b.workDays);
    reset({ name: b.name, specialty: b.specialty, avatar: b.avatar, image: b.image, rating: b.rating, bio: b.bio });
  };

  const cancelEdit = () => { setEditingId(null); setWorkDays(ALL_DAYS); reset(EMPTY); };

  const toggleFormDay = (d) =>
    setWorkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await updateBarber.mutateAsync({ id: editingId, ...data, workDays });
        toast.success('آرایشگر ویرایش شد.');
      } else {
        await createBarber.mutateAsync({ ...data, workDays });
        toast.success('آرایشگر جدید افزوده شد.');
      }
      cancelEdit();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onDelete = async (id) => {
    const ok = await confirm({ title: 'حذف آرایشگر', description: 'این آرایشگر حذف می‌شود. ادامه می‌دهید؟', danger: true, confirmText: 'حذف' });
    if (!ok) return;
    deleteBarber.mutate(id, {
      onSuccess: () => toast.success('آرایشگر حذف شد.'),
      onError: (e) => toast.error(e.message),
    });
  };

  // تغییر سریع روز کاری از داخل لیست
  const quickToggleDay = (barber, day) => {
    const next = barber.workDays.includes(day)
      ? barber.workDays.filter((d) => d !== day)
      : [...barber.workDays, day].sort((a, b) => a - b);
    updateBarber.mutate({ id: barber.id, workDays: next }, { onError: (e) => toast.error(e.message) });
  };

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-3xl">
        <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-amber-500" />
          {editingId ? 'ویرایش آرایشگر' : 'افزودن آرایشگر جدید'}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="نام:" error={errors.name?.message}>
              <Input placeholder="مثال: سهراب امینی" error={errors.name} {...register('name')} />
            </Field>
            <Field label="تخصص:" error={errors.specialty?.message}>
              <Input placeholder="مثال: متخصص فید" {...register('specialty')} />
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

          <Field label="روزهای کاری:">
            <div className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleFormDay(d)}
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

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" loading={createBarber.isPending || updateBarber.isPending}>
              {editingId ? <><Pencil className="w-4 h-4" /> ذخیره تغییرات</> : <><Plus className="w-4 h-4" /> افزودن آرایشگر</>}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={cancelEdit}><X className="w-4 h-4" /> انصراف</Button>
            )}
          </div>
        </form>
      </div>

      <div className="glass p-6 rounded-3xl">
        <h3 className="text-base font-bold text-zinc-100 mb-4">آرایشگران ({toPersianDigits(barbers.length)})</h3>
        <div className="space-y-4">
          {barbers.map((barber) => (
            <div key={barber.id} className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {barber.avatar ? <img src={barber.avatar} alt={barber.name} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-zinc-800" />}
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">{barber.name}</h4>
                    <p className="text-[10px] text-zinc-500">{barber.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(barber)} className="p-1.5 text-zinc-500 hover:text-amber-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => onDelete(barber.id)} className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 font-bold mb-2">روزهای کاری (سبز: کاری / خاکستری: مرخصی):</p>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => quickToggleDay(barber, d)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border',
                        barber.workDays.includes(d)
                          ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400 hover:bg-emerald-950/60'
                          : 'bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-800'
                      )}
                    >
                      {DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {barbers.length === 0 && <p className="text-zinc-500 text-xs text-center py-4">آرایشگری ثبت نشده است.</p>}
        </div>
      </div>
    </div>
  );
}
