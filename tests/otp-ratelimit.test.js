import { describe, it, expect } from 'vitest';
import { generateOtp, hashOtp, OTP_LENGTH } from '@/lib/otp';
import { rateLimit, clientIp } from '@/lib/rate-limit';

describe('generateOtp', () => {
  it('کدِ ۶ رقمیِ عددی در بازه‌ی درست', () => {
    for (let i = 0; i < 200; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^[0-9]{6}$/);
      const n = Number(otp);
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
      expect(otp.length).toBe(OTP_LENGTH);
    }
  });
});

describe('hashOtp', () => {
  it('قطعی است (ورودیِ یکسان → hash یکسان)', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'));
  });
  it('کدهای متفاوت hashِ متفاوت', () => {
    expect(hashOtp('123456')).not.toBe(hashOtp('123457'));
  });
  it('عدد و رشته یکسان hash می‌شوند (String cast)', () => {
    expect(hashOtp(123456)).toBe(hashOtp('123456'));
  });
  it('sha256 hex ۶۴ کاراکتری', () => {
    expect(hashOtp('123456')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('rateLimit (fixed-window)', () => {
  it('تا سقف اجازه می‌دهد و بعد رد می‌کند', () => {
    const key = `test-${Math.random()}`;
    const opts = { key, limit: 3, windowMs: 10_000 };
    expect(rateLimit(opts).ok).toBe(true);  // 1
    expect(rateLimit(opts).ok).toBe(true);  // 2
    expect(rateLimit(opts).ok).toBe(true);  // 3
    const blocked = rateLimit(opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
  it('کلیدهای متفاوت سطلِ جدا دارند', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(rateLimit({ key: a, limit: 1, windowMs: 10_000 }).ok).toBe(true);
    expect(rateLimit({ key: a, limit: 1, windowMs: 10_000 }).ok).toBe(false);
    expect(rateLimit({ key: b, limit: 1, windowMs: 10_000 }).ok).toBe(true);
  });
  it('remaining درست شمرده می‌شود', () => {
    const key = `rem-${Math.random()}`;
    expect(rateLimit({ key, limit: 5, windowMs: 10_000 }).remaining).toBe(4);
    expect(rateLimit({ key, limit: 5, windowMs: 10_000 }).remaining).toBe(3);
  });
});

describe('clientIp', () => {
  const req = (headers) => ({ headers: { get: (h) => headers[h.toLowerCase()] ?? null } });
  it('x-real-ip اولویت دارد', () => {
    expect(clientIp(req({ 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' }))).toBe('1.2.3.4');
  });
  it('در نبودِ x-real-ip از راست‌ترین hopِ x-forwarded-for', () => {
    expect(clientIp(req({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' }))).toBe('3.3.3.3');
  });
  it('بدونِ هیچ هدر → unknown', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});
