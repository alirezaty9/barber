import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { guardCron, generateBookingCode, parseBody, ApiError } from '@/lib/api-helpers';

// ─────────────────────────────────────────────────────────────
//  نگهبان‌های مسیرهای API.
//
//  این‌ها «درِ ورودیِ» سرورند. اگر یکی‌شان باز بماند هیچ خطایی دیده نمی‌شود — فقط یک نفر
//  از بیرون می‌تواند کاری کند که نباید. پس هر کدام باید تستِ خودش را داشته باشد، نه صرفاً
//  یک بار چشمی بررسی شود.
// ─────────────────────────────────────────────────────────────

/** ساختِ یک درخواستِ ساختگی با هدر و/یا پارامترِ آدرس. */
const req = ({ auth, secret } = {}) => {
  const url = secret != null
    ? `https://x.test/api/cron/expire-pending?secret=${encodeURIComponent(secret)}`
    : 'https://x.test/api/cron/expire-pending';
  return new Request(url, { headers: auth ? { authorization: auth } : {} });
};

describe('guardCron — درِ مسیرهای زمان‌بندی‌شده', () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  // 🔴 مهم‌ترین قید: بدونِ رمزِ تنظیم‌شده مسیر باید **بسته** باشد، نه باز برای همه.
  // رفتارِ معکوس (باز وقتی رمز نیست) یعنی هر کسی می‌تواند کارِ پاک‌سازی را صدا بزند.
  it('بدونِ CRON_SECRET همه را رد می‌کند (fail-closed)', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = guardCron(req({ auth: 'Bearer anything' }));
    expect(res?.status).toBe(401);
  });

  it('بدونِ CRON_SECRET حتی درخواستِ بدونِ رمز را هم رد می‌کند', () => {
    vi.stubEnv('CRON_SECRET', '');
    expect(guardCron(req()).status).toBe(401);
  });

  it('رمزِ درست در هدرِ Bearer پذیرفته می‌شود', () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t-value');
    expect(guardCron(req({ auth: 'Bearer s3cr3t-value' }))).toBeNull();
  });

  it('رمزِ درست در پارامترِ آدرس هم پذیرفته می‌شود (برای سرویس‌هایی که هدر نمی‌فرستند)', () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t-value');
    expect(guardCron(req({ secret: 's3cr3t-value' }))).toBeNull();
  });

  it('رمزِ غلط رد می‌شود', () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t-value');
    expect(guardCron(req({ auth: 'Bearer wrong' })).status).toBe(401);
    expect(guardCron(req({ secret: 'wrong' })).status).toBe(401);
  });

  it('رمزی که فقط پیشوندِ رمزِ درست است پذیرفته نمی‌شود', () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t-value');
    expect(guardCron(req({ auth: 'Bearer s3cr3t' })).status).toBe(401);
  });

  it('رمزِ درست با کاراکترِ اضافه پذیرفته نمی‌شود', () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t-value');
    expect(guardCron(req({ auth: 'Bearer s3cr3t-value!' })).status).toBe(401);
  });

  it('طرحِ احراز هویتِ دیگر (Basic) پذیرفته نمی‌شود', () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t-value');
    expect(guardCron(req({ auth: 'Basic s3cr3t-value' })).status).toBe(401);
  });

  it('حساس به بزرگی و کوچکیِ حروف است', () => {
    vi.stubEnv('CRON_SECRET', 's3cr3t-value');
    expect(guardCron(req({ auth: 'Bearer S3CR3T-VALUE' })).status).toBe(401);
  });
});

describe('generateBookingCode — کدِ رهگیری', () => {
  // این کد نقشِ «اعتبارنامه» دارد: هر کسی که آن را داشته باشد می‌تواند نوبت را ببیند.
  // پس باید غیرقابلِ حدس و غیرقابلِ شمارش باشد.
  it('قالبِ ثابت دارد: BK + ۱۰ کاراکترِ hex بزرگ', () => {
    expect(generateBookingCode()).toMatch(/^BK[0-9A-F]{10}$/);
  });

  it('در ۲۰۰۰ تولید هیچ تکراری ندارد', () => {
    const seen = new Set();
    for (let i = 0; i < 2000; i++) seen.add(generateBookingCode());
    expect(seen.size).toBe(2000);
  });

  it('دو کدِ پشتِ‌سرِهم پیش‌بینی‌پذیر نیستند (متوالی نیستند)', () => {
    const a = parseInt(generateBookingCode().slice(2), 16);
    const b = parseInt(generateBookingCode().slice(2), 16);
    expect(Math.abs(a - b)).toBeGreaterThan(1);
  });
});

describe('parseBody — اعتبارسنجیِ بدنه‌ی درخواست', () => {
  const schema = z.object({ name: z.string().min(2, { message: 'نام کوتاه است.' }) });
  const jsonReq = (body) =>
    new Request('https://x.test/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

  it('بدنه‌ی درست را برمی‌گرداند', async () => {
    const { data, response } = await parseBody(jsonReq(JSON.stringify({ name: 'علی' })), schema);
    expect(response).toBeUndefined();
    expect(data).toEqual({ name: 'علی' });
  });

  it('JSONِ خراب باعثِ کرش نمی‌شود — ۴۰۰ برمی‌گردد', async () => {
    const { response } = await parseBody(jsonReq('{ این JSON نیست'), schema);
    expect(response.status).toBe(400);
  });

  it('بدنه‌ی خالی هم ۴۰۰ می‌گیرد', async () => {
    const { response } = await parseBody(jsonReq(''), schema);
    expect(response.status).toBe(400);
  });

  it('پیامِ خطای فارسیِ اسکیما به کاربر می‌رسد (نه متنِ عمومی)', async () => {
    const { response } = await parseBody(jsonReq(JSON.stringify({ name: 'ع' })), schema);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('نام کوتاه است.');
  });
});

describe('ApiError — خطای قابلِ تبدیل به پاسخِ HTTP', () => {
  it('کد و پیام را حفظ می‌کند', async () => {
    const res = new ApiError(409, 'این ساعت پر است.').toResponse();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('این ساعت پر است.');
  });
  it('یک Error واقعی است (قابلِ throw و catch)', () => {
    expect(() => { throw new ApiError(400, 'x'); }).toThrow(Error);
  });
});
