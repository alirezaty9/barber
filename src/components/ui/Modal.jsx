'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * مودال دسترس‌پذیر مبتنی بر Radix Dialog:
 * focus-trap، بستن با Esc، قفل اسکرول پس‌زمینه و aria به‌صورت آماده فراهم است.
 */
export default function Modal({ open, onOpenChange, title, description, children, className, showClose = true }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md" />
        <Dialog.Content
          dir="rtl"
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2',
            'max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl focus:outline-none',
            className
          )}
        >
          <Dialog.Title className={cn('sr-only')}>{title || 'پنجره'}</Dialog.Title>
          {description ? (
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
          ) : null}

          {showClose && (
            <Dialog.Close
              aria-label="بستن"
              className="absolute top-5 left-5 z-10 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl border border-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </Dialog.Close>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
