'use client';

import { useRouter } from 'next/navigation';
import { X, Filter } from 'lucide-react';
import JalaliDatePicker from '@/components/ui/JalaliDatePicker';
import Field from '@/components/ui/Field';

// نوار فیلتر داشبورد: بر اساس بازه‌ی تاریخ (از/تا).
// با هر تغییر، پارامترهای URL به‌روز می‌شود و صفحه‌ی سروری دوباره با فیلتر رندر می‌شود.
export default function DashboardFilters({ from, to }) {
  const router = useRouter();

  const update = (patch) => {
    const next = { from, to, ...patch };
    const qs = new URLSearchParams();
    if (next.from) qs.set('from', next.from);
    if (next.to) qs.set('to', next.to);
    const s = qs.toString();
    router.push(s ? `/admin?${s}` : '/admin');
  };

  const hasFilter = Boolean(from || to);

  return (
    <div className="glass p-4 rounded-2xl">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-bold text-zinc-300">فیلتر گزارش</span>
        {hasFilter && (
          <button
            onClick={() => router.push('/admin')}
            className="mr-auto flex items-center gap-1 text-[11px] font-bold text-red-400 hover:text-red-300"
          >
            <X className="w-3.5 h-3.5" /> پاک‌کردن فیلترها
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="از تاریخ:">
          <JalaliDatePicker value={from} onChange={(iso) => update({ from: iso || undefined })} minDate={null} placeholder="ابتدای بازه" />
        </Field>

        <Field label="تا تاریخ:">
          <JalaliDatePicker value={to} onChange={(iso) => update({ to: iso || undefined })} minDate={null} placeholder="انتهای بازه" />
        </Field>
      </div>
    </div>
  );
}
