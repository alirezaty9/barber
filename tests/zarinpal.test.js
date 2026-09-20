import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─────────────────────────────────────────────────────────────
//  لایه‌ی درگاهِ پرداخت.
//
//  اینجا پولِ واقعی در میان است، پس تست‌ها روی دو چیز تمرکز دارند که خرابی‌شان
//  **بی‌صدا** است و هیچ خطایی نمی‌دهد:
//    ۱) حالتِ «پرداختِ ساختگی» نباید هرگز به پروداکشن نشت کند — وگرنه هر رزرو بدونِ
//       هیچ پرداختی «موفق» ثبت می‌شود و آرایشگاه خدمتِ رایگان می‌دهد.
//    ۲) استرداد باید fail-closed باشد — وقتی پولی برنمی‌گردد نباید «مسترد شد» بگوید،
//       وگرنه داشبورد مبلغی را «برگشته» گزارش می‌کند که هنوز دستِ آرایشگاه است.
//
//  ⚠️ هیچ درخواستِ واقعی‌ای به زرین‌پال زده نمی‌شود؛ fetch در همه‌ی تست‌ها جایگزین می‌شود.
// ─────────────────────────────────────────────────────────────

/** ماژول را با محیطِ دلخواه تازه بارگذاری می‌کند (چون فلگ‌ها در لحظه‌ی import خوانده می‌شوند). */
async function loadWith(env) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return import('@/lib/zarinpal');
}

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('🔴 حالتِ پرداختِ ساختگی نباید به پروداکشن نشت کند', () => {
  it('در توسعه، با فلگِ صریح و بدونِ merchant، پرداختِ ساختگی کار می‌کند', async () => {
    const z = await loadWith({
      NODE_ENV: 'development', ALLOW_MOCK_PAYMENT: 'true', ZARINPAL_MERCHANT_ID: '',
    });
    const r = await z.requestPayment({ amount: 1000, description: 'x', callbackUrl: 'https://x.test/cb' });
    expect(r.ok).toBe(true);
    expect(r.mock).toBe(true);
  });

  // 🔴 این تست همان چیزی را می‌سنجد که اگر بشکند، آرایشگاه بی‌صدا خدمتِ رایگان می‌دهد.
  it('در پروداکشن، حتی با فلگِ روشن، پرداختِ ساختگی فعال نمی‌شود', async () => {
    const z = await loadWith({
      NODE_ENV: 'production', ALLOW_MOCK_PAYMENT: 'true', ZARINPAL_MERCHANT_ID: '',
    });
    // نه merchant داریم و نه mockِ مجاز ⇒ باید خطا بدهد، نه «موفقیتِ ساختگی».
    await expect(
      z.requestPayment({ amount: 1000, description: 'x', callbackUrl: 'https://x.test/cb' }),
    ).rejects.toThrow(/ZARINPAL_MERCHANT_ID/);
  });

  it('بدونِ فلگ و بدونِ merchant، پرداخت خطا می‌دهد (نه رزروِ رایگانِ خاموش)', async () => {
    const z = await loadWith({
      NODE_ENV: 'development', ALLOW_MOCK_PAYMENT: 'false', ZARINPAL_MERCHANT_ID: '',
    });
    await expect(
      z.requestPayment({ amount: 1000, description: 'x', callbackUrl: 'https://x.test/cb' }),
    ).rejects.toThrow();
  });

  it('با merchantِ واقعی، حالتِ ساختگی فعال نمی‌شود حتی اگر فلگ روشن باشد', async () => {
    const z = await loadWith({
      NODE_ENV: 'development', ALLOW_MOCK_PAYMENT: 'true', ZARINPAL_MERCHANT_ID: 'real-merchant-id',
      ZARINPAL_SANDBOX: 'true',
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ data: { code: 100, authority: 'A123', ref_id: 999 } }),
    })));
    const r = await z.requestPayment({ amount: 1000, description: 'x', callbackUrl: 'https://x.test/cb' });
    expect(r.mock).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});

describe('verifyPayment — تأییدِ پرداخت', () => {
  const env = { NODE_ENV: 'development', ZARINPAL_MERCHANT_ID: 'm', ZARINPAL_SANDBOX: 'true' };

  it('کدِ ۱۰۰ یعنی پرداختِ موفق', async () => {
    const z = await loadWith(env);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ data: { code: 100, ref_id: 12345, amount: 300000 } }),
    })));
    const r = await z.verifyPayment({ amount: 300000, authority: 'A1' });
    expect(r).toMatchObject({ ok: true, refId: '12345', paidAmount: 300000 });
  });

  // کدِ ۱۰۱ یعنی «قبلاً تأیید شده» — این هم پرداختِ انجام‌شده است. اگر شکست شمرده شود،
  // رفرشِ صفحه‌ی بازگشت باعث می‌شود نوبتِ پرداخت‌شده «ناموفق» ثبت شود.
  it('کدِ ۱۰۱ («قبلاً تأیید شده») هم موفق است', async () => {
    const z = await loadWith(env);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ data: { code: 101, ref_id: 777, amount: 100 } }),
    })));
    expect((await z.verifyPayment({ amount: 100, authority: 'A1' })).ok).toBe(true);
  });

  it('کدِ خطا با پیامِ خودِ درگاه برمی‌گردد', async () => {
    const z = await loadWith(env);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      json: async () => ({ data: { code: -51 }, errors: [{ message: 'تراکنش ناموفق' }] }),
    })));
    const r = await z.verifyPayment({ amount: 100, authority: 'A1' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('تراکنش ناموفق');
  });

  // اگر شبکه قطع شود، تابع نباید throw کند — وگرنه صفحه‌ی بازگشت با خطای ۵۰۰ سفید می‌شود
  // و مشتری‌ای که پول داده هیچ پیامی نمی‌گیرد.
  it('قطعیِ شبکه باعثِ کرش نمی‌شود — شکستِ کنترل‌شده برمی‌گرداند', async () => {
    const z = await loadWith(env);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    const r = await z.verifyPayment({ amount: 100, authority: 'A1' });
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('پاسخِ بی‌شکل (بدونِ data) موفق شمرده نمی‌شود', async () => {
    const z = await loadWith(env);
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({}) })));
    expect((await z.verifyPayment({ amount: 100, authority: 'A1' })).ok).toBe(false);
  });
});

describe('🔴 refundPayment — همیشه fail-closed', () => {
  const base = { NODE_ENV: 'development', ZARINPAL_MERCHANT_ID: 'm' };

  it('بدونِ توکنِ استرداد شکست می‌خورد، نه موفقیتِ دفتری', async () => {
    const z = await loadWith({ ...base, ZARINPAL_ACCESS_TOKEN: '', ZARINPAL_SANDBOX: 'false' });
    const r = await z.refundPayment({ amount: 1000, authority: 'A1' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ZARINPAL_ACCESS_TOKEN/);
  });

  it('در حالتِ تستیِ درگاه شکست می‌خورد (سرویسِ استرداد آنجا وجود ندارد)', async () => {
    const z = await loadWith({ ...base, ZARINPAL_ACCESS_TOKEN: 'tok', ZARINPAL_SANDBOX: 'true' });
    const r = await z.refundPayment({ amount: 1000, authority: 'A1' });
    expect(r.ok).toBe(false);
  });

  it('بدونِ شناسه‌ی تراکنش شکست می‌خورد', async () => {
    const z = await loadWith({ ...base, ZARINPAL_ACCESS_TOKEN: 'tok', ZARINPAL_SANDBOX: 'false' });
    const r = await z.refundPayment({ amount: 1000, authority: null });
    expect(r.ok).toBe(false);
  });

  it('هیچ‌کدام از حالت‌های شکست درخواستی به درگاه نمی‌فرستند', async () => {
    const z = await loadWith({ ...base, ZARINPAL_ACCESS_TOKEN: '', ZARINPAL_SANDBOX: 'true' });
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    await z.refundPayment({ amount: 1000, authority: 'A1' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('قطعیِ شبکه هم شکستِ کنترل‌شده می‌دهد، نه کرش', async () => {
    const z = await loadWith({ ...base, ZARINPAL_ACCESS_TOKEN: 'tok', ZARINPAL_SANDBOX: 'false' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const r = await z.refundPayment({ amount: 1000, authority: 'A1' });
    expect(r.ok).toBe(false);
  });

  it('فقط پاسخِ صریحاً موفقِ درگاه «مسترد شد» شمرده می‌شود', async () => {
    const z = await loadWith({ ...base, ZARINPAL_ACCESS_TOKEN: 'tok', ZARINPAL_SANDBOX: 'false' });
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ data: { code: 100, id: 55 } }) })));
    expect((await z.refundPayment({ amount: 1000, authority: 'A1' })).ok).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ errors: [{ message: 'رد شد' }] }) })));
    expect((await z.refundPayment({ amount: 1000, authority: 'A1' })).ok).toBe(false);
  });
});
