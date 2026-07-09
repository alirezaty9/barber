'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const PERIODS = [
  { key: 'today', label: 'امروز' },
  { key: '7', label: '۷ روز' },
  { key: '30', label: '۳۰ روز' },
  { key: '90', label: '۹۰ روز' },
  { key: 'year', label: 'امسال' },
  { key: 'all', label: 'کل' },
];

// انتخابگرِ بازه‌ی داشبورد — با URL کار می‌کند تا صفحه‌ی سروری دوباره رندر شود.
export default function DashboardPeriod({ value }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-1.5">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => router.push(p.key === '30' ? '/admin' : `/admin?period=${p.key}`)}
          className={cn(
            'px-4 py-2 rounded-xl text-xs font-bold transition-all border',
            value === p.key
              ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/10'
              : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
