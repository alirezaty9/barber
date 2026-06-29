'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors';

export const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(base, error && 'border-red-900/70 focus:border-red-500/60', className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(base, 'resize-none', error && 'border-red-900/70 focus:border-red-500/60', className)}
      {...props}
    />
  );
});
