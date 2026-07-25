import { describe, it, expect } from 'vitest';
import {
  bookingSchema, serviceSchema, barberSchema, blockSchema,
  lookupSchema, cancelSchema, loginSchema, MAX_BOOKING_ADVANCE_DAYS,
} from '@/lib/validation';
import { tehranTodayISO, shiftISO } from '@/lib/time';

const today = tehranTodayISO();
const validBooking = (over = {}) => ({
  customerName: 'علی رضایی',
  customerPhone: '09123456789',
  serviceIds: ['svc1'],
  date: today,
  timeSlot: '10:00',
  ...over,
});

describe('bookingSchema — شماره موبایل', () => {
  it('شماره‌ی فارسی نرمال و پذیرفته می‌شود', () => {
    const r = bookingSchema.safeParse(validBooking({ customerPhone: '۰۹۱۲۳۴۵۶۷۸۹' }));
    expect(r.success).toBe(true);
    expect(r.data.customerPhone).toBe('09123456789');
  });
  it('شماره‌ی نامعتبر رد می‌شود', () => {
    expect(bookingSchema.safeParse(validBooking({ customerPhone: '12345' })).success).toBe(false);
  });
});

describe('bookingSchema — تاریخ', () => {
  it('امروز معتبر است', () => {
    expect(bookingSchema.safeParse(validBooking({ date: today })).success).toBe(true);
  });
  it('دیروز هم (به‌خاطرِ tolerance یک‌روزه) معتبر است', () => {
    expect(bookingSchema.safeParse(validBooking({ date: shiftISO(today, -1) })).success).toBe(true);
  });
  it('دو روز پیش رد می‌شود', () => {
    expect(bookingSchema.safeParse(validBooking({ date: shiftISO(today, -2) })).success).toBe(false);
  });
  it('تا سقفِ مجاز معتبر، فراتر از آن رد', () => {
    expect(bookingSchema.safeParse(validBooking({ date: shiftISO(today, MAX_BOOKING_ADVANCE_DAYS) })).success).toBe(true);
    expect(bookingSchema.safeParse(validBooking({ date: shiftISO(today, MAX_BOOKING_ADVANCE_DAYS + 1) })).success).toBe(false);
  });
  it('تاریخِ تقویمیِ ناموجود (2026-13-45) رد می‌شود', () => {
    expect(bookingSchema.safeParse(validBooking({ date: '2026-13-45' })).success).toBe(false);
  });
  it('تاریخِ 2026-02-30 (روزِ ناموجود) رد می‌شود', () => {
    expect(bookingSchema.safeParse(validBooking({ date: '2026-02-30' })).success).toBe(false);
  });
});

describe('bookingSchema — خدمات و نام', () => {
  it('serviceIds خالی رد می‌شود', () => {
    expect(bookingSchema.safeParse(validBooking({ serviceIds: [] })).success).toBe(false);
  });
  it('نامِ خالی رد می‌شود', () => {
    expect(bookingSchema.safeParse(validBooking({ customerName: '   ' })).success).toBe(false);
  });
  it('timeSlot با قالبِ غلط رد می‌شود', () => {
    expect(bookingSchema.safeParse(validBooking({ timeSlot: '9:0' })).success).toBe(false);
  });
});

describe('serviceSchema', () => {
  it('قیمتِ منفی/صفر رد می‌شود', () => {
    expect(serviceSchema.safeParse({ name: 'x', price: 0, category: 'hair' }).success).toBe(false);
    expect(serviceSchema.safeParse({ name: 'x', price: -100, category: 'hair' }).success).toBe(false);
  });
  it('دسته‌ی نامعتبر رد می‌شود', () => {
    expect(serviceSchema.safeParse({ name: 'x', price: 100, category: 'unknown' }).success).toBe(false);
  });
  it('duration پیش‌فرضِ ۷۵ می‌گیرد', () => {
    const r = serviceSchema.safeParse({ name: 'x', price: 100, category: 'hair' });
    expect(r.success).toBe(true);
    expect(r.data.duration).toBe(75);
  });
  it('قیمتِ رشته‌ای عددی coerce می‌شود', () => {
    const r = serviceSchema.safeParse({ name: 'x', price: '150000', category: 'hair' });
    expect(r.success).toBe(true);
    expect(r.data.price).toBe(150000);
  });
});

describe('barberSchema — workDays', () => {
  it('پیش‌فرضِ همه‌ی روزها', () => {
    const r = barberSchema.safeParse({ name: 'آرایشگر' });
    expect(r.success).toBe(true);
    expect(r.data.workDays).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('روزِ خارج از بازه (7) رد می‌شود', () => {
    expect(barberSchema.safeParse({ name: 'x', workDays: [0, 7] }).success).toBe(false);
  });
});

describe('blockSchema', () => {
  it('کل‌روز با بازه', () => {
    const r = blockSchema.safeParse({ barberId: 'b1', date: '2026-07-25', dateTo: '2026-07-27', fullDay: true });
    expect(r.success).toBe(true);
  });
  it('barberId خالی رد می‌شود', () => {
    expect(blockSchema.safeParse({ barberId: '', date: '2026-07-25' }).success).toBe(false);
  });
});

describe('lookup / cancel / login', () => {
  it('lookup فقط با شماره‌ی معتبر', () => {
    expect(lookupSchema.safeParse({ phone: '09123456789' }).success).toBe(true);
    expect(lookupSchema.safeParse({ phone: 'abc' }).success).toBe(false);
  });
  it('cancel نیازمندِ code و otpِ ۶ رقمی', () => {
    expect(cancelSchema.safeParse({ code: 'BK123', otp: '123456' }).success).toBe(true);
    expect(cancelSchema.safeParse({ code: 'BK123', otp: '12' }).success).toBe(false);
  });
  it('login نیازمندِ رمزِ غیرخالی', () => {
    expect(loginSchema.safeParse({ password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ password: '' }).success).toBe(false);
  });
});
