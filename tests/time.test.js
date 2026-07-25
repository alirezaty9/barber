import { describe, it, expect } from 'vitest';
import { shiftISO, weekdayIndexSaturday, rangeISO, tehranTodayISO } from '@/lib/time';

describe('shiftISO', () => {
  it('برو جلو و عقب روی مرزِ ماه', () => {
    expect(shiftISO('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftISO('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftISO('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('سالِ کبیسه', () => {
    expect(shiftISO('2028-02-28', 1)).toBe('2028-02-29'); // 2028 کبیسه است
    expect(shiftISO('2026-02-28', 1)).toBe('2026-03-01'); // 2026 کبیسه نیست
  });
  it('delta صفر رشته را دست‌نخورده برمی‌گرداند', () => {
    expect(shiftISO('2026-07-25', 0)).toBe('2026-07-25');
  });
});

describe('weekdayIndexSaturday (0=شنبه ... 6=جمعه)', () => {
  // 2026-07-25 شنبه است (میلادی Saturday) → باید 0 شود.
  it('شنبه = 0', () => {
    expect(weekdayIndexSaturday('2026-07-25')).toBe(0);
  });
  it('یکشنبه تا جمعه', () => {
    expect(weekdayIndexSaturday('2026-07-26')).toBe(1); // Sunday
    expect(weekdayIndexSaturday('2026-07-27')).toBe(2); // Monday
    expect(weekdayIndexSaturday('2026-07-31')).toBe(6); // Friday
  });
});

describe('rangeISO', () => {
  it('بازه‌ی شاملِ هر دو سر', () => {
    expect(rangeISO('2026-07-25', '2026-07-27')).toEqual(['2026-07-25', '2026-07-26', '2026-07-27']);
  });
  it('یک روز وقتی to خالی است', () => {
    expect(rangeISO('2026-07-25')).toEqual(['2026-07-25']);
  });
  it('to قبل از from → فقط from', () => {
    expect(rangeISO('2026-07-25', '2026-07-20')).toEqual(['2026-07-25']);
  });
  it('سقفِ ایمنی cap رعایت می‌شود', () => {
    const out = rangeISO('2026-01-01', '2026-12-31', 5);
    expect(out.length).toBe(5);
  });
});

describe('tehranTodayISO', () => {
  it('قالبِ YYYY-MM-DD معتبر برمی‌گرداند', () => {
    expect(tehranTodayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
