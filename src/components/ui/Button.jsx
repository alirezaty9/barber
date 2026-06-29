'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold shadow-lg shadow-amber-500/10',
  secondary: 'bg-zinc-100 hover:bg-zinc-200 text-black font-bold',
  outline: 'border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100',
  ghost: 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900',
  danger: 'bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black border border-red-900/50 hover:border-transparent',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
