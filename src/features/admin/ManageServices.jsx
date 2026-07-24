'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Scissors, Trash2, Pencil, Plus, X, ImagePlus, Loader2 } from 'lucide-react';
import { serviceSchema, CATEGORIES } from '@/lib/validation';
import { CATEGORY_LABELS } from '@/lib/constants';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/api/services';
import { formatPrice, toPersianDigits } from '@/lib/persian';
import { compressImageToDataUrl } from '@/lib/image';
import { confirm } from '@/components/ui/confirm';
import { Input, Textarea } from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';

const EMPTY = { name: '', price: '', description: '', category: 'hair', image: '' };

export default function ManageServices() {
  const { data: services = [] } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: EMPTY,
  });

  // مقدارِ فعلیِ عکس در فرم (data URL یا آدرس) — برای پیش‌نمایش.
  const image = watch('image');

  const startEdit = (svc) => {
    setEditingId(svc.id);
    reset({ name: svc.name, price: svc.price, description: svc.description, category: svc.category, image: svc.image || '' });
  };

  const cancelEdit = () => { setEditingId(null); reset(EMPTY); };

  // انتخابِ فایل → فشرده‌سازی در مرورگر → ذخیره‌ی data URL در فرم.
  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // تا انتخابِ دوباره‌ی همان فایل هم رویداد بدهد
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImageToDataUrl(file, { maxDim: 800, quality: 0.8 });
      setValue('image', dataUrl, { shouldValidate: true, shouldDirty: true });
    } catch (err) {
      toast.error(err.message || 'خطا در پردازش عکس.');
    } finally {
      setUploading(false);
    }
  };

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
            <Field label="دسته‌بندی:" error={errors.category?.message}>
              <Select {...register('category')}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="توضیحات:" error={errors.description?.message}>
            <Textarea rows={2} placeholder="توضیح کوتاه درباره‌ی خدمت..." {...register('description')} />
          </Field>

          {/* آپلودِ عکسِ اختصاصیِ خدمت (اختیاری) */}
          <Field label="تصویر خدمت (اختیاری):" error={errors.image?.message}>
            {/* مقدارِ عکس در فرم نگه داشته می‌شود؛ ورودیِ مخفی برای react-hook-form */}
            <input type="hidden" {...register('image')} />
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden flex items-center justify-center">
                {image
                  ? <img src={image} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                  : <ImagePlus className="w-6 h-6 text-zinc-600" />}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-300 hover:border-zinc-700 cursor-pointer transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {image ? 'تغییر عکس' : 'انتخاب عکس'}
                  <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
                </label>
                {image && (
                  <button type="button" onClick={() => setValue('image', '', { shouldDirty: true })} className="mr-2 text-xs text-red-400 hover:text-red-300">
                    حذف عکس
                  </button>
                )}
                <p className="text-[10px] text-zinc-500 mt-1.5">اگر عکسی ندهی، از تصویرِ پیش‌فرضِ دسته‌بندی استفاده می‌شود.</p>
              </div>
            </div>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden flex items-center justify-center">
                  {svc.image
                    ? <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" />
                    : <Scissors className="w-4 h-4 text-zinc-600" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">{svc.name}</h4>
                  <span className="text-[10px] text-zinc-500">{CATEGORY_LABELS[svc.category]}</span>
                </div>
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
