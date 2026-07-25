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
    const res = computeAvailability({ existing: [{ timeSlot: '11:15' }] });
    expect(slotAt(res, '11:15').available).toBe(false);
    expect(slotAt(res, '11:15').reason).toBe('booked');
    expect(slotAt(res, '10:00').available).toBe(true);
  });
  it('بستنِ ساعتی فقط همان ساعت را می‌بندد', () => {
    const res = computeAvailability({ existing: [], blocks: [{ timeSlot: '15:00' }] });
    expect(slotAt(res, '15:00').available).toBe(false);
    expect(slotAt(res, '15:00').reason).toBe('blocked');
    expect(slotAt(res, '16:15').available).toBe(true);
  });
  it('رزرو فقط یک ساعت را می‌گیرد، نه ساعتِ بعدی', () => {
    const res = computeAvailability({ existing: [{ timeSlot: '12:30' }] });
    expect(slotAt(res, '13:45').available).toBe(true);
  });
});

describe('computeAvailability — گذشتِ زمان (امروز)', () => {
  it('اسلاتِ گذشته و اسلاتِ همین‌لحظه غیرقابل‌انتخاب', () => {
    // nowMinutes = 12:30 (750). اسلات‌های <= 750 باید past شوند.
    const res = computeAvailability({ existing: [], nowMinutes: timeToMin('12:30') });
    expect(slotAt(res, '10:00').reason).toBe('past');
    expect(slotAt(res, '11:15').reason).toBe('past');
    expect(slotAt(res, '12:30').reason).toBe('past'); // دقیقاً همین لحظه هم قابل رزرو نیست
    expect(slotAt(res, '13:45').available).toBe(true);
  });
  it('nowMinutes=-1 (روزِ آینده) هیچ اسلاتی past نمی‌شود', () => {
    const res = computeAvailability({ existing: [], nowMinutes: -1 });
    expect(res.slots.every((s) => s.available)).toBe(true);
  });
});

describe('computeAvailability — اولویتِ دلایل', () => {
  it('past بر blocked/booked اولویت دارد', () => {
    const res = computeAvailability({
      existing: [{ timeSlot: '10:00' }],
      blocks: [{ timeSlot: '10:00' }],
      nowMinutes: timeToMin('11:15'),
    });
    expect(slotAt(res, '10:00').reason).toBe('past');
  });
});
