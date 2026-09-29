import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCancelPatch, refundShareFor } from '@/lib/api-helpers';

describe('buildCancelPatch — قواعدِ استرداد', () => {
  it('لغوِ مشتری روی نوبتِ پرداخت‌شده → ۵۰٪ استرداد', () => {
    const patch = buildCancelPatch({ paymentStatus: 'paid', amount: 300000 }, 'customer');
    expect(patch.status).toBe('cancelled');
    expect(patch.cancelledBy).toBe('customer');
    expect(patch.paymentStatus).toBe('refunded');
    expect(patch.refundAmount).toBe(150000);
  });
  it('لغوِ ادمین روی نوبتِ پرداخت‌شده → ۱۰۰٪ استرداد', () => {
    const patch = buildCancelPatch({ paymentStatus: 'paid', amount: 300000 }, 'admin');
    expect(patch.paymentStatus).toBe('refunded');
    expect(patch.refundAmount).toBe(300000);
  });
  it('نوبتِ پرداخت‌نشده → بدونِ استرداد', () => {
    const patch = buildCancelPatch({ paymentStatus: 'unpaid', amount: 300000 }, 'customer');
    expect(patch.paymentStatus).toBeUndefined();
    expect(patch.refundAmount).toBeUndefined();
    expect(patch.status).toBe('cancelled');
  });
  it('مبلغِ صفر → بدونِ استرداد حتی اگر paid', () => {
    const patch = buildCancelPatch({ paymentStatus: 'paid', amount: 0 }, 'customer');
    expect(patch.refundAmount).toBeUndefined();
  });
  it('۵۰٪ مبلغِ فرد با Math.floor گرد می‌شود (بدونِ کسرِ اعشار)', () => {
    const patch = buildCancelPatch({ paymentStatus: 'paid', amount: 150001 }, 'customer');
    expect(patch.refundAmount).toBe(75000); // floor(75000.5)
  });
});

describe('refundShareFor — مبلغِ تسویه‌ی دستی', () => {
  it('لغوِ مشتری → ۵۰٪ مبلغ', () => {
    expect(refundShareFor({ cancelledBy: 'customer', amount: 300000 })).toBe(150000);
  });
  it('لغوِ مدیریت → کلِ مبلغ', () => {
    expect(refundShareFor({ cancelledBy: 'admin', amount: 300000 })).toBe(300000);
  });
  it('بدونِ لغوکننده (اسلات از دست رفت یا مبلغ نخواند) → کلِ مبلغ', () => {
    // این حالت تقصیرِ مشتری نبوده، پس قاعده‌ی ۵۰٪ به او تحمیل نمی‌شود.
    expect(refundShareFor({ cancelledBy: null, amount: 300000 })).toBe(300000);
  });
  it('مبلغِ فردِ لغوِ مشتری رو به پایین گرد می‌شود', () => {
    expect(refundShareFor({ cancelledBy: 'customer', amount: 150001 })).toBe(75000);
  });
  it('مبلغِ نامشخص → صفر، نه NaN', () => {
    expect(refundShareFor({ cancelledBy: 'customer' })).toBe(0);
  });
});

// ── کلیدِ ایمنیِ استرداد ──
// resolveCancelPatch تنها دروازه‌ای است که همه‌ی مسیرهای لغوِ اپ از آن رد می‌شوند.
// اگر این کلید بی‌اثر شود، با یک درگاهِ سندباکسی یا توکنِ غایب، نوبت‌ها برچسبِ «مسترد شده»
// می‌گیرند بدونِ اینکه ریالی برگشته باشد — یعنی داشبورد پولی را کسرشده گزارش می‌کند که
// هنوز دستِ آرایشگاه است. پس هر دو حالتِ کلید باید تست شوند، نه فقط حالتِ فعلی.
describe('resolveCancelPatch — رفتار با کلیدِ REFUNDS_ENABLED', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  async function loadWith(flag) {
    vi.stubEnv('NEXT_PUBLIC_REFUNDS_ENABLED', flag);
    return (await import('@/lib/api-helpers')).resolveCancelPatch;
  }

  it('کلید خاموش → فقط «لغو»؛ هیچ ادعای استردادی ثبت نمی‌شود', async () => {
    const resolveCancelPatch = await loadWith('false');
    const patch = resolveCancelPatch({ paymentStatus: 'paid', amount: 300000 }, 'customer');
    expect(patch).toEqual({ status: 'cancelled', cancelledBy: 'customer' });
    // مهم‌ترین قید: وضعیتِ پرداخت دست‌نخورده می‌ماند تا پنل واقعیت را نشان دهد.
    expect(patch.paymentStatus).toBeUndefined();
    expect(patch.refundAmount).toBeUndefined();
  });

  it('کلید خاموش → لغوِ مدیریت هم استرداد نمی‌سازد', async () => {
    const resolveCancelPatch = await loadWith('false');
    const patch = resolveCancelPatch({ paymentStatus: 'paid', amount: 300000 }, 'admin');
    expect(patch.refundAmount).toBeUndefined();
  });

  it('کلید روشن → دقیقاً همان قاعده‌ی buildCancelPatch برمی‌گردد', async () => {
    const resolveCancelPatch = await loadWith('true');
    expect(resolveCancelPatch({ paymentStatus: 'paid', amount: 300000 }, 'customer')).toEqual(
      buildCancelPatch({ paymentStatus: 'paid', amount: 300000 }, 'customer'),
    );
    expect(resolveCancelPatch({ paymentStatus: 'paid', amount: 300000 }, 'admin')).toEqual(
      buildCancelPatch({ paymentStatus: 'paid', amount: 300000 }, 'admin'),
    );
  });

  it('کلید روشن ولی نوبت پرداخت‌نشده → باز هم استردادی در کار نیست', async () => {
    const resolveCancelPatch = await loadWith('true');
    const patch = resolveCancelPatch({ paymentStatus: 'unpaid', amount: 300000 }, 'customer');
    expect(patch.refundAmount).toBeUndefined();
  });
});

// ── درصدها فقط یک منبع دارند ──
// صفحه‌ی «قوانین و مقررات» از ۱۴۰۵/۰۷/۰۷ همین درصدها را **به مشتری وعده می‌دهد**.
// اگر منطقِ استرداد عددِ جداگانه‌ی خودش را داشته باشد، روزی که یکی عوض شود صفحه‌ی قوانین
// بی‌صدا به مشتری دروغ می‌گوید. این تست‌ها آن جدایی را غیرممکن می‌کنند.
describe('درصدهای استرداد — یک منبعِ حقیقت', () => {
  it('لغوِ مشتری دقیقاً همان REFUND_CUSTOMER_PERCENT را اعمال می‌کند', async () => {
    const { REFUND_CUSTOMER_PERCENT } = await import('@/lib/features');
    const patch = buildCancelPatch({ paymentStatus: 'paid', amount: 400000 }, 'customer');
    expect(patch.refundAmount).toBe(Math.floor(400000 * (REFUND_CUSTOMER_PERCENT / 100)));
  });

  it('لغوِ مدیریت دقیقاً همان REFUND_SHOP_CANCEL_PERCENT را اعمال می‌کند', async () => {
    const { REFUND_SHOP_CANCEL_PERCENT } = await import('@/lib/features');
    const patch = buildCancelPatch({ paymentStatus: 'paid', amount: 400000 }, 'admin');
    expect(patch.refundAmount).toBe(Math.floor(400000 * (REFUND_SHOP_CANCEL_PERCENT / 100)));
  });

  it('محاسبه‌ی لحظه‌ی لغو و محاسبه‌ی تسویه‌ی دستی به یک عدد می‌رسند', () => {
    // قبلاً این دو تابع برای «لغوکننده‌ی نامشخص» دو عددِ متفاوت می‌دادند. حالا هر دو از
    // یک منبع می‌خوانند، پس مبلغی که به مشتری وعده داده می‌شود و مبلغی که آرایشگر
    // «برگرداندم» ثبت می‌کند نمی‌توانند از هم جدا بیفتند.
    for (const who of ['customer', 'admin']) {
      const patch = buildCancelPatch({ paymentStatus: 'paid', amount: 333333 }, who);
      expect(refundShareFor({ cancelledBy: who, amount: 333333 })).toBe(patch.refundAmount);
    }
  });
});

// ── متنِ رسمیِ سیاستِ بازگشتِ وجه ──
// 🔴 این تست از یک تصمیمِ کسب‌وکاری محافظت می‌کند، نه از یک جزئیاتِ فنی.
// تعهدِ «۵۰٪ برمی‌گردد» باید **مستقل از** کلیدِ استردادِ خودکار به مشتری گفته شود، چون
// استردادِ دستی هم یک اجرای معتبر از همان تعهد است و صفحه‌ی قوانین رویش بنا شده.
// اگر کسی روزی این متن را دوباره به REFUNDS_ENABLED گره بزند، همین تست می‌شکند.
describe('REFUND_POLICY_NOTE — متنی که به مشتری نشان داده می‌شود', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  async function loadFeatures({ refunds, sms }) {
    vi.stubEnv('NEXT_PUBLIC_REFUNDS_ENABLED', refunds);
    vi.stubEnv('NEXT_PUBLIC_SMS_ENABLED', sms);
    return import('@/lib/features');
  }

  it('با استردادِ خودکارِ خاموش هم درصدِ بازگشت را اعلام می‌کند', async () => {
    const f = await loadFeatures({ refunds: 'false', sms: 'false' });
    expect(f.REFUNDS_ENABLED).toBe(false);
    expect(f.REFUND_POLICY_NOTE).toContain('۵۰٪');
  });

  it('با استردادِ خودکارِ روشن همان درصد را اعلام می‌کند', async () => {
    const f = await loadFeatures({ refunds: 'true', sms: 'false' });
    expect(f.REFUND_POLICY_NOTE).toContain('۵۰٪');
  });

  it('درصد همیشه با ارقامِ فارسی نوشته می‌شود، نه لاتین', async () => {
    const f = await loadFeatures({ refunds: 'false', sms: 'false' });
    expect(f.REFUND_POLICY_NOTE).not.toMatch(/[0-9]/);
  });

  it('با پیامکِ خاموش، «تماس تلفنی» را به‌عنوان راهِ لغو می‌گوید', async () => {
    const f = await loadFeatures({ refunds: 'false', sms: 'false' });
    expect(f.REFUND_POLICY_NOTE).toContain('تماس تلفنی');
  });

  it('با پیامکِ روشن، دیگر مشتری را به تلفن ارجاع نمی‌دهد', async () => {
    const f = await loadFeatures({ refunds: 'false', sms: 'true' });
    expect(f.REFUND_POLICY_NOTE).not.toContain('تماس تلفنی');
    expect(f.REFUND_POLICY_NOTE).toContain('۵۰٪');
  });

  it('مهلتِ لغو (روزِ قبل) در هر دو حالت به مشتری گفته می‌شود', async () => {
    for (const sms of ['false', 'true']) {
      vi.resetModules();
      const f = await loadFeatures({ refunds: 'false', sms });
      expect(f.REFUND_POLICY_NOTE).toContain('روزِ قبل');
    }
  });
});
