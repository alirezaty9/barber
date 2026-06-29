import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * ترکیب کلاس‌های شرطی Tailwind به‌صورت تمیز و بدون تداخل.
 * مثال: cn('px-2', condition && 'px-4') → در صورت true خروجی 'px-4'
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
