import { describe, it, expect } from 'vitest';
import { computeAvailability, timeToMin } from '@/lib/availability';
import { TIME_SLOTS } from '@/lib/constants';

const slotAt = (res, time) => res.slots.find((s) => s.time === time);

describe('timeToMin', () => {
  it('ساعت را به دقیقه تبدیل می‌کند', () => {
    expect(timeToMin('10:00')).toBe(600);
    expect(timeToMin('11:15')).toBe(675);
    expect(timeToMin('00:00')).toBe(0);
  });
});

describe('computeAvailability — تعطیلی', () => {
  it('بستنِ کل‌روز → همه اسلات‌ها dayOff', () => {
    const res = computeAvailability({ existing: [], blocks: [{ timeSlot: null }] });
    expect(res.dayOff).toBe(true);
    expect(res.slots.every((s) => !s.available && s.reason === 'dayoff')).toBe(true);
  });
  it('روزِ غیرکاری → dayOff حتی بدونِ بلاک', () => {
    const res = computeAvailability({ existing: [], isWorkingDay: false });
    expect(res.dayOff).toBe(true);
  });
  it('روزِ کاریِ عادی → dayOff=false و همه آزاد', () => {
    const res = computeAvailability({ existing: [], isWorkingDay: true });
    expect(res.dayOff).toBe(false);
    expect(res.slots.length).toBe(TIME_SLOTS.length);
    expect(res.slots.every((s) => s.available)).toBe(true);
  });
});

describe('computeAvailability — اشغال', () => {
  it('اسلاتِ رزروشده available=false با reason=booked', () => {
    const res = computeAvailability({ existing: [{ timeSlot: TIME_SLOTS[1] }] });
    expect(slotAt(res, TIME_SLOTS[1]).available).toBe(false);
    expect(slotAt(res, TIME_SLOTS[1]).reason).toBe('booked');
    expect(slotAt(res, TIME_SLOTS[0]).available).toBe(true);
  });
  it('بستنِ ساعتی فقط همان ساعت را می‌بندد', () => {
    const res = computeAvailability({ existing: [], blocks: [{ timeSlot: TIME_SLOTS[4] }] });
    expect(slotAt(res, TIME_SLOTS[4]).available).toBe(false);
    expect(slotAt(res, TIME_SLOTS[4]).reason).toBe('blocked');
    expect(slotAt(res, TIME_SLOTS[5]).available).toBe(true);
  });
  it('رزرو فقط یک ساعت را می‌گیرد، نه ساعتِ بعدی', () => {
    const res = computeAvailability({ existing: [{ timeSlot: TIME_SLOTS[2] }] });
    expect(slotAt(res, TIME_SLOTS[3]).available).toBe(true);
  });
});

describe('computeAvailability — گذشتِ زمان (امروز)', () => {
  it('اسلاتِ گذشته و اسلاتِ همین‌لحظه غیرقابل‌انتخاب', () => {
    // nowMinutes را برابرِ سومین اسلات می‌گذاریم؛ اسلات‌های <= آن باید past شوند.
    const res = computeAvailability({ existing: [], nowMinutes: timeToMin(TIME_SLOTS[2]) });
    expect(slotAt(res, TIME_SLOTS[0]).reason).toBe('past');
    expect(slotAt(res, TIME_SLOTS[1]).reason).toBe('past');
    expect(slotAt(res, TIME_SLOTS[2]).reason).toBe('past'); // دقیقاً همین لحظه هم قابل رزرو نیست
    expect(slotAt(res, TIME_SLOTS[3]).available).toBe(true);
  });
  it('nowMinutes=-1 (روزِ آینده) هیچ اسلاتی past نمی‌شود', () => {
    const res = computeAvailability({ existing: [], nowMinutes: -1 });
    expect(res.slots.every((s) => s.available)).toBe(true);
  });
});

describe('computeAvailability — اولویتِ دلایل', () => {
  it('past بر blocked/booked اولویت دارد', () => {
    const res = computeAvailability({
      existing: [{ timeSlot: TIME_SLOTS[0] }],
      blocks: [{ timeSlot: TIME_SLOTS[0] }],
      nowMinutes: timeToMin(TIME_SLOTS[1]),
    });
    expect(slotAt(res, TIME_SLOTS[0]).reason).toBe('past');
  });
});
