'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Scissors, Trash2, Pencil, Plus, X } from 'lucide-react';
import { serviceSchema, CATEGORIES } from '@/lib/validation';
import { CATEGORY_LABELS } from '@/lib/constants';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/api/services';
import { formatPrice, toPersianDigits } from '@/lib/persian';
import { confirm } from '@/components/ui/confirm';
import { Input, Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';

const EMPTY = { name: '', price: '', duration: 30, description: '', category: 'hair' };

export default function ManageServices() {
  const { data: services = [] } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const [editingId, setEditingId] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: EMPTY,
  });

  const startEdit = (svc) => {
    setEditingId(svc.id);
    reset({ name: svc.name, price: svc.price, duration: svc.duration, description: svc.description, category: svc.category });
  };

  const cancelEdit = () => { setEditingId(null); reset(EMPTY); };

  const onSubmit = async (data) => {
    try {
      if (editingId) {
        await updateService.mutateAsync({ id: editingId, ...data });
        toast.success('خدمت ویرایش شد.');
      } else {
        await createService.mutateAsync(data);
        toast.success('خدمت جدید افزوده شد.');
      }
      cancelEdit();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onDelete = async (id) => {
    const ok = await confirm({ title: 'حذف خدمت', description: 'این خدمت حذف می‌شود. ادامه می‌دهید؟', danger: true, confirmText: 'حذف' });
    if (!ok) return;
    deleteService.mutate(id, {
      onSuccess: () => toast.success('خدمت حذف شد.'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="glass p-6 rounded-3xl">
        <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
          <Scissors className="w-5 h-5 text-amber-500" />
          {editingId ? 'ویرایش خدمت' : 'افزودن خدمت جدید'}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="عنوان خدمت:" error={errors.name?.message}>
            <Input placeholder="مثال: رنگ‌کردن مو تخصصی" error={errors.name} {...register('name')} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="قیمت (تومان):" error={errors.price?.message}>
              <Input type="number" placeholder="۳۰۰۰۰۰" error={errors.price} {...register('price')} />
            </Field>
            <Field label="مدت (دقیقه):" error={errors.duration?.message}>
              <Input type="number" error={errors.duration} {...register('duration')} />
            </Field>
          </div>

          <Field label="دسته‌بندی:" error={errors.category?.message}>
            <Select {...register('category')}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </Select>
          </Field>

          <Field label="توضیحات:" error={errors.description?.message}>
            <Textarea rows={2} placeholder="توضیح کوتاه درباره‌ی خدمت..." {...register('description')} />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" loading={createService.isPending || updateService.isPending}>
              {editingId ? <><Pencil className="w-4 h-4" /> ذخیره تغییرات</> : <><Plus className="w-4 h-4" /> افزودن خدمت</>}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={cancelEdit}><X className="w-4 h-4" /> انصراف</Button>
            )}
          </div>
        </form>
      </div>

      <div className="glass p-6 rounded-3xl">
        <h3 className="text-base font-bold text-zinc-100 mb-4">خدمات فعال ({toPersianDigits(services.length)})</h3>
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.id} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-zinc-200">{svc.name}</h4>
                <span className="text-[10px] text-zinc-500">{CATEGORY_LABELS[svc.category]} · {toPersianDigits(svc.duration)} دقیقه</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-amber-500">{formatPrice(svc.price)}</span>
                <button onClick={() => startEdit(svc)} className="p-1.5 text-zinc-500 hover:text-amber-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => onDelete(svc.id)} className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {services.length === 0 && <p className="text-zinc-500 text-xs text-center py-4">خدمتی ثبت نشده است.</p>}
        </div>
      </div>
    </div>
  );
}
