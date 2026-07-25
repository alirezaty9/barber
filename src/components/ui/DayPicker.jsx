'use client';

import { formatJalaliDate } from '@/lib/persian';
import { tehranTodayISO, shiftISO } from '@/lib/time';
import { cn } from '@/lib/utils';

// انتخابگرِ ساده‌ی روز: N روزِ آینده از امروز، به‌صورت دکمه‌های قابل‌کلیک.
// جایگزینِ تقویمِ کتابخانه‌ای که با تقویم شمسی و حالت کنترل‌شده باگ داشت
// (فقط یک روز انتخاب می‌شد و روزِ انتخاب‌شده تغییر نمی‌کرد).
export default function DayPicker({ value, onChange, days = 8 }) {
  // «امروز» را به وقتِ ایران می‌سازیم (نه تایم‌زونِ مرورگرِ کاربر) تا دقیقاً با بازه‌ی مجازِ
  // سمتِ سرور (bookingDate در validation) یکی باشد؛ وگرنه کاربری در تایم‌زونِ جلوتر از ایران،
  // نزدیکِ نیمه‌شب، روزی خارج از سقف انتخاب می‌کرد و POST با ۴۰۰ رد می‌شد.
  const today = tehranTodayISO();
  const list = Array.from({ length: days }, (_, i) => ({ iso: shiftISO(today, i), offset: i }));

  const title = (iso, offset) =>
    offset === 0 ? 'امروز' : offset === 1 ? 'فردا' : formatJalaliDate(iso, { weekday: 'long' });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {list.map(({ iso, offset }) => {
        const selected = value === iso;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onChange(iso)}
            className={cn(
              'p-3 rounded-xl border text-center transition-all',
              selected
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            )}
          >
            <span className="block text-xs font-bold">{title(iso, offset)}</span>
            <span className={cn('block text-[10px] mt-0.5', selected ? 'text-amber-400/80' : 'text-zinc-500')}>
              {formatJalaliDate(iso, { day: 'numeric', month: 'long' })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
