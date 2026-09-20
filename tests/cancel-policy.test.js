import { describe, it, expect } from 'vitest';
import { isWithinCancelWindow } from '@/lib/cancel-policy';
import { tehranTodayISO, shiftISO } from '@/lib/time';

// قاعده‌ی کسب‌وکار: لغو فقط تا روزِ قبل از نوبت ممکن است.
// این تست همان قاعده را قفل می‌کند تا کسی به‌اشتباه «سهل‌گیرترش» نکند.
const today = tehranTodayISO();

describe('isWithinCancelWindow — لغو فقط تا روزِ قبل', () => {
  it('نوبتِ فردا قابلِ لغو است', () => {
    expect(isWithinCancelWindow({ date: shiftISO(today, 1) })).toBe(true);
  });

  it('نوبتِ هفته‌ی آینده قابلِ لغو است', () => {
    expect(isWithinCancelWindow({ date: shiftISO(today, 7) })).toBe(true);
  });

  // مرزِ اصلیِ قاعده: امروز دیگر دیر است — فرقی نمی‌کند ساعتِ نوبت ۹ صبح باشد یا ۸ شب.
  it('نوبتِ امروز قابلِ لغو نیست', () => {
    expect(isWithinCancelWindow({ date: today })).toBe(false);
  });

  it('نوبتِ دیروز قابلِ لغو نیست', () => {
    expect(isWithinCancelWindow({ date: shiftISO(today, -1) })).toBe(false);
  });

  it('ورودیِ بی‌تاریخ، امنِ fail-closed است', () => {
    expect(isWithinCancelWindow({})).toBe(false);
    expect(isWithinCancelWindow(null)).toBe(false);
  });
});
