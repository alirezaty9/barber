import { describe, it, expect } from 'vitest';
import { buildCancelPatch } from '@/lib/api-helpers';

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
