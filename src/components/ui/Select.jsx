'use client';

import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// انتخابگر مبتنی بر <select> بومی — دسترس‌پذیر و روی موبایل بسیار روان؛
// با ظاهر هماهنگ تم تیره.
const Select = forwardRef(function Select({ className, children, error, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'w-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl pr-4 pl-9 py-2.5 outline-none focus:border-amber-500/50 transition-colors',
          error && 'border-red-900/70',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
