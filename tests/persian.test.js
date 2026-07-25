import { describe, it, expect } from 'vitest';
import { normalizeDigits, toPersianDigits, isValidIranMobile, formatPrice, formatJalaliDate } from '@/lib/persian';

describe('normalizeDigits', () => {
  it('ارقام فارسی → انگلیسی', () => {
    expect(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
  });
  it('ارقام عربی → انگلیسی', () => {
    expect(normalizeDigits('٠٩١٢')).toBe('0912');
  });
  it('null/undefined → رشته‌ی خالی', () => {
    expect(normalizeDigits(null)).toBe('');
    expect(normalizeDigits(undefined)).toBe('');
  });
  it('متنِ مخلوط را دست‌نخورده نگه می‌دارد جز ارقام', () => {
    expect(normalizeDigits('کد ۱۲۳')).toBe('کد 123');
  });
});

describe('toPersianDigits', () => {
  it('انگلیسی → فارسی', () => {
    expect(toPersianDigits('10:00')).toBe('۱۰:۰۰');
  });
  it('عدد ورودی هم می‌پذیرد', () => {
    expect(toPersianDigits(2026)).toBe('۲۰۲۶');
  });
});

describe('isValidIranMobile', () => {
  it('شماره‌ی معتبرِ فارسی/انگلیسی', () => {
    expect(isValidIranMobile('09123456789')).toBe(true);
    expect(isValidIranMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe(true);
    expect(isValidIranMobile(' 09123456789 ')).toBe(true);
  });
  it('شماره‌های نامعتبر رد می‌شوند', () => {
    expect(isValidIranMobile('9123456789')).toBe(false); // بدونِ 0
    expect(isValidIranMobile('0912345678')).toBe(false); // ۱۰ رقم
    expect(isValidIranMobile('091234567890')).toBe(false); // ۱۲ رقم
    expect(isValidIranMobile('08123456789')).toBe(false); // با 09 شروع نمی‌شود
  });
});

describe('formatPrice', () => {
  it('قیمت را با «تومان» برمی‌گرداند', () => {
    const out = formatPrice(320000);
    expect(out).toContain('تومان');
    expect(normalizeDigits(out).replace(/[^\d]/g, '')).toBe('320000');
  });
});

describe('formatJalaliDate — مستقل از تایم‌زون (رگرسیونِ off-by-one)', () => {
  it('۲۰۲۶-۰۳-۲۱ = نوروز = ۱ فروردین', () => {
    expect(formatJalaliDate('2026-03-21')).toBe('۱ فروردین');
  });
  it('۲۰۲۶-۰۷-۲۵ = ۳ مرداد (نه ۲ مرداد در تایم‌زونِ عقب‌تر)', () => {
    expect(formatJalaliDate('2026-07-25')).toBe('۳ مرداد');
  });
  it('روزِ هفته درست است', () => {
    expect(formatJalaliDate('2026-07-25', { weekday: 'long' })).toBe('شنبه');
  });
  it('ورودیِ خراب → همان رشته‌ی ورودی (بدونِ throw)', () => {
    expect(formatJalaliDate('not-a-date')).toBe('not-a-date');
  });
});
