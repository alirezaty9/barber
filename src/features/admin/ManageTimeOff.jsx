'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CalendarOff, Trash2, Plus, Clock, Ban } from 'lucide-react';
import { useBarbers } from '@/api/barbers';
import { useBlocks, useCreateBlock, useDeleteBlock } from '@/api/blocks';
import { TIME_SLOTS } from '@/lib/constants';
import { formatJalaliDate, toPersianDigits } from '@/lib/persian';
import { confirm } from '@/components/ui/confirm';
import Select from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import JalaliDatePicker from '@/components/ui/JalaliDatePicker';
import { cn } from '@/lib/utils';

export default function ManageTimeOff() {
  const { data: barbers = [] } = useBarbers();
  const [barberId, setBarberId] = useState('');
  const [mode, setMode] = useState('fullDay'); // fullDay | hours
  const [date, setDate] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [slots, setSlots] = useState([]);
  const [reason, setReason] = useState('');

  const { data: blocks = [] } = useBlocks(barberId);
  const createBlock = useCreateBlock();
  const deleteBlock = useDeleteBlock();

  const toggleSlot = (t) =>
    setSlots((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const resetForm = () => { setDate(''); setDateTo(''); setSlots([]); setReason(''); };

  const onSave = async () => {
    if (!barberId) { toast.error('اول یک آرایشگر انتخاب کن.'); return; }
    if (!date) { toast.error('تاریخ را انتخاب کن.'); return; }
    if (mode === 'hours' && slots.length === 0) { toast.error('حداقل یک ساعت را انتخاب کن.'); return; }

    const payload = {
      barberId,
      date,
      fullDay: mode === 'fullDay',
      slots: mode === 'hours' ? slots : [],
      reason: reason.trim(),
      ...(mode === 'fullDay' && dateTo ? { dateTo } : {}),
    };

    try {
      const res = await createBlock.mutateAsync(payload);
      toast.success(res?.created > 0 ? 'زمان موردنظر بسته شد.' : 'این زمان‌ها از قبل بسته بودند.');
      resetForm();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onDelete = async (id) => {
    const okConfirm = await confirm({ title: 'باز کردن زمان', description: 'این محدودیت برداشته می‌شود و کاربران دوباره می‌توانند این زمان را رزرو کنند.', confirmText: 'باز کن' });
    if (!okConfirm) return;
    deleteBlock.mutate(id, {
      onSuccess: () => toast.success('زمان باز شد.'),
      onError: (e) => toast.error(e.message),
    });
  };

  // گروه‌بندی بلاک‌ها بر اساس تاریخ برای نمایش تمیزتر.
  const grouped = blocks.reduce((acc, b) => {
    (acc[b.date] = acc[b.date] || []).push(b);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <CalendarOff className="w-6 h-6 text-amber-500" /> مرخصی و بستن ساعت
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          روزها یا ساعت‌هایی که آرایشگر در دسترس نیست را ببند تا مشتری نتواند آن زمان‌ها نوبت بگیرد.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* فرم بستن زمان */}
        <div className="glass p-6 rounded-3xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-500" /> بستن زمان جدید
          </h3>

          <Field label="آرایشگر:">
            <Select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              <option value="">— انتخاب آرایشگر —</option>
              {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>

          {/* حالت: کل روز یا ساعت‌های مشخص */}
          <Field label="نوع بستن:">
            <div className="grid grid-cols-2 gap-2">
              <ModeBtn active={mode === 'fullDay'} onClick={() => setMode('fullDay')} icon={CalendarOff} label="کل روز (مرخصی)" />
              <ModeBtn active={mode === 'hours'} onClick={() => setMode('hours')} icon={Clock} label="ساعت‌های مشخص" />
            </div>
          </Field>

          <Field label={mode === 'fullDay' ? 'از تاریخ:' : 'تاریخ:'}>
            <JalaliDatePicker value={date} onChange={setDate} placeholder="روز را انتخاب کن" />
          </Field>

          {mode === 'fullDay' && (
            <Field label="تا تاریخ (اختیاری — برای چند روز پشت‌سرهم):">
              <JalaliDatePicker value={dateTo} onChange={setDateTo} placeholder="اگر چند روز است، روز پایان را بزن" />
            </Field>
          )}

          {mode === 'hours' && (
            <Field label="ساعت‌هایی که بسته می‌شوند:">
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleSlot(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border',
                      slots.includes(t)
                        ? 'bg-red-950/40 border-red-900 text-red-400'
                        : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800'
                    )}
                  >
                    {toPersianDigits(t)}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="علت (اختیاری):">
            <Input placeholder="مثلاً: مرخصی، سفر، جلسه…" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>

          <Button onClick={onSave} className="w-full" loading={createBlock.isPending}>
            <Plus className="w-4 h-4" /> بستن این زمان
          </Button>
        </div>

        {/* فهرست زمان‌های بسته */}
        <div className="glass p-6 rounded-3xl">
          <h3 className="text-base font-bold text-zinc-100 mb-4">
            زمان‌های بسته {barberId ? '' : '(اول آرایشگر را انتخاب کن)'}
          </h3>

          {!barberId ? (
            <p className="text-zinc-500 text-xs text-center py-8">برای دیدن زمان‌های بسته، یک آرایشگر انتخاب کن.</p>
          ) : Object.keys(grouped).length === 0 ? (
            <p className="text-zinc-500 text-xs text-center py-8">هیچ زمانی برای این آرایشگر بسته نشده است.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([d, items]) => {
                const fullDay = items.find((x) => !x.timeSlot);
                const hourItems = items.filter((x) => x.timeSlot);
                return (
                  <div key={d} className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-2xl">
                    <p className="text-xs font-bold text-zinc-200 mb-2">{formatJalaliDate(d)}</p>

                    {fullDay && (
                      <div className="flex items-center justify-between bg-red-950/30 border border-red-900/50 rounded-xl px-3 py-2 mb-2">
                        <span className="text-[11px] font-bold text-red-400 flex items-center gap-1.5">
                          <CalendarOff className="w-3.5 h-3.5" /> کل روز بسته {fullDay.reason ? `· ${fullDay.reason}` : ''}
                        </span>
                        <button onClick={() => onDelete(fullDay.id)} className="p-1 text-zinc-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}

                    {hourItems.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {hourItems.map((h) => (
                          <span key={h.id} className="inline-flex items-center gap-1 bg-red-950/30 border border-red-900/50 rounded-lg pl-1 pr-2 py-1 text-[11px] font-bold text-red-400">
                            {toPersianDigits(h.timeSlot)}
                            <button onClick={() => onDelete(h.id)} className="text-zinc-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all',
        active ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:border-zinc-800'
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
