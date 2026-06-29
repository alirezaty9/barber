'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirmStore } from './confirm';

// میزبان دیالوگ تایید — یک‌بار در Providers مانت می‌شود و به confirm() پاسخ می‌دهد.
export default function ConfirmHost() {
  const { open, options, resolver, hide } = useConfirmStore();

  const finish = (result) => {
    resolver?.(result);
    hide();
  };

  const {
    title = 'آیا مطمئن هستید؟',
    description = 'این عملیات قابل بازگشت نیست.',
    confirmText = 'تایید',
    cancelText = 'انصراف',
    danger = false,
  } = options;

  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => !o && finish(false)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md" />
        <AlertDialog.Content
          dir="rtl"
          className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl focus:outline-none"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className={cn('p-2.5 rounded-2xl border', danger ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500')}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <AlertDialog.Title className="text-base font-bold text-white">{title}</AlertDialog.Title>
              <AlertDialog.Description className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</AlertDialog.Description>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <AlertDialog.Cancel asChild>
              <button className="px-4 py-2 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs font-bold rounded-xl transition-colors">
                {cancelText}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                onClick={() => finish(true)}
                className={cn(
                  'px-5 py-2 text-xs font-extrabold rounded-xl transition-colors',
                  danger ? 'bg-red-500 hover:bg-red-600 text-black' : 'bg-amber-500 hover:bg-amber-600 text-black'
                )}
              >
                {confirmText}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
