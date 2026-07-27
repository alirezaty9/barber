import { describe, it, expect, vi } from 'vitest';
import {
  resolveAvailability,
  releaseStalePendingSlot,
  PENDING_HOLD_MS,
} from '@/lib/availability-server';
import { TIME_SLOTS } from '@/lib/constants';

// ── تستِ لایه‌ی سرور بدونِ دیتابیس ──
// resolveAvailability یک «client» می‌گیرد؛ به‌جای Prismaِ واقعی یک client ساختگی می‌دهیم که
// داده‌های کنترل‌شده برمی‌گرداند. این‌طور دقیقاً همان منطقی که باگِ ۱ در آن بود
// (فیلترِ رزروِ pending/unpaidِ کهنه) را واقعاً اجرا و راستی‌آزمایی می‌کنیم.

const SAT = '2026-07-25'; // این تاریخ «شنبه» است → index=0 در قراردادِ پروژه.

// ساختِ یک client ساختگی: خروجیِ هر سه کوئریِ resolveAvailability را کنترل می‌کنیم.
function fakeClient({ barber = { id: 'b1', workDays: '0,1,2,3,4,5,6' }, bookings = [], blocks = [] }) {
  return {
    barber: { findUnique: vi.fn().mockResolvedValue(barber) },
    booking: { findMany: vi.fn().mockResolvedValue(bookings) },
    barberBlock: { findMany: vi.fn().mockResolvedValue(blocks) },
  };
}

const minutesAgo = (m) => new Date(Date.now() - m * 60_000);
const slotAt = (res, t) => res.slots.find((s) => s.time === t);

describe('resolveAvailability — فیلترِ رزروِ کهنه (هسته‌ی باگِ ۱)', () => {
  it('رزروِ pending/unpaidِ کهنه (قدیمی‌تر از hold) اسلات را آزاد می‌کند', async () => {
    const client = fakeClient({
      bookings: [{ timeSlot: TIME_SLOTS[1], status: 'pending', paymentStatus: 'unpaid', createdAt: minutesAgo(20) }],
    });
    const res = await resolveAvailability({ barberId: 'b1', date: SAT }, client);
    expect(res.dayOff).toBe(false);
    expect(slotAt(res, TIME_SLOTS[1]).available).toBe(true); // کهنه → آزاد
  });

  it('رزروِ pending/unpaidِ تازه (داخلِ hold) هنوز اسلات را می‌گیرد', async () => {
    const client = fakeClient({
      bookings: [{ timeSlot: TIME_SLOTS[1], status: 'pending', paymentStatus: 'unpaid', createdAt: minutesAgo(5) }],
    });
    const res = await resolveAvailability({ barberId: 'b1', date: SAT }, client);
    expect(slotAt(res, TIME_SLOTS[1]).available).toBe(false);
    expect(slotAt(res, TIME_SLOTS[1]).reason).toBe('booked');
  });

  it('رزروِ paid/confirmed صرف‌نظر از قدمت، همیشه اسلات را می‌گیرد', async () => {
    const client = fakeClient({
      bookings: [{ timeSlot: TIME_SLOTS[1], status: 'confirmed', paymentStatus: 'paid', createdAt: minutesAgo(999) }],
    });
    const res = await resolveAvailability({ barberId: 'b1', date: SAT }, client);
    expect(slotAt(res, TIME_SLOTS[1]).available).toBe(false);
  });

  it('cutoff دقیقاً برابرِ PENDING_HOLD_MS: کمی قدیمی‌تر آزاد، کمی تازه‌تر اشغال', async () => {
    const justStale = new Date(Date.now() - PENDING_HOLD_MS - 1000);
    const justFresh = new Date(Date.now() - PENDING_HOLD_MS + 5000);
    const stale = await resolveAvailability({ barberId: 'b1', date: SAT }, fakeClient({
      bookings: [{ timeSlot: TIME_SLOTS[0], status: 'pending', paymentStatus: 'unpaid', createdAt: justStale }],
    }));
    const fresh = await resolveAvailability({ barberId: 'b1', date: SAT }, fakeClient({
      bookings: [{ timeSlot: TIME_SLOTS[0], status: 'pending', paymentStatus: 'unpaid', createdAt: justFresh }],
    }));
    expect(slotAt(stale, TIME_SLOTS[0]).available).toBe(true);
    expect(slotAt(fresh, TIME_SLOTS[0]).available).toBe(false);
  });
});

describe('resolveAvailability — تعطیلی و خطا', () => {
  it('آرایشگرِ یافت‌نشده → error', async () => {
    const client = fakeClient({ barber: null });
    const res = await resolveAvailability({ barberId: 'x', date: SAT }, client);
    expect(res.error).toBeTruthy();
    expect(res.dayOff).toBe(true);
  });

  it('روزِ غیرکاری (workDays شاملِ شنبه نیست) → dayOff', async () => {
    const client = fakeClient({ barber: { id: 'b1', workDays: '1,2,3,4,5,6' } }); // بدونِ 0=شنبه
    const res = await resolveAvailability({ barberId: 'b1', date: SAT }, client);
    expect(res.dayOff).toBe(true);
  });

  it('workDays خالی → همه‌ی روزها کاری فرض می‌شوند', async () => {
    const client = fakeClient({ barber: { id: 'b1', workDays: '' } });
    const res = await resolveAvailability({ barberId: 'b1', date: SAT }, client);
    expect(res.dayOff).toBe(false);
  });

  it('بستنِ کل‌روز (بلاکِ بدونِ timeSlot) → dayOff', async () => {
    const client = fakeClient({ blocks: [{ timeSlot: null }] });
    const res = await resolveAvailability({ barberId: 'b1', date: SAT }, client);
    expect(res.dayOff).toBe(true);
  });
});

describe('releaseStalePendingSlot — کوئریِ آزادسازی (رفعِ باگِ ۱)', () => {
  it('updateMany را با شرطِ درست (pending/unpaid/کهنه) و لغو صدا می‌زند', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = { booking: { updateMany } };
    const before = Date.now();
    await releaseStalePendingSlot(tx, { barberId: 'b1', date: SAT, timeSlot: TIME_SLOTS[1] });

    expect(updateMany).toHaveBeenCalledTimes(1);
    const arg = updateMany.mock.calls[0][0];
    // شرطِ where: فقط رزروِ همان اسلات، pending، unpaid، و کهنه (createdAt < cutoff).
    expect(arg.where).toMatchObject({
      barberId: 'b1', date: SAT, timeSlot: TIME_SLOTS[1],
      status: 'pending', paymentStatus: 'unpaid',
    });
    const cutoff = arg.where.createdAt.lt;
    expect(cutoff instanceof Date).toBe(true);
    // cutoff باید حدودِ «الان منهای PENDING_HOLD_MS» باشد.
    expect(cutoff.getTime()).toBeLessThanOrEqual(before - PENDING_HOLD_MS + 1000);
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - PENDING_HOLD_MS - 1000);
    // داده: به cancelled/failed تبدیل شود.
    expect(arg.data).toEqual({ status: 'cancelled', paymentStatus: 'failed' });
  });

  it('اسلاتِ تازه (غیرکهنه) را نباید هدف بگیرد چون createdAt<cutoff نمی‌شود', async () => {
    // این را با شرطِ کوئری تضمین می‌کنیم؛ خودِ Postgres رکوردِ تازه را به‌خاطرِ createdAt<cutoff رد می‌کند.
    // اینجا فقط اطمینان می‌گیریم شرطِ createdAt.lt وجود دارد (نه اینکه همه را لغو کند).
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    await releaseStalePendingSlot({ booking: { updateMany } }, { barberId: 'b1', date: SAT, timeSlot: TIME_SLOTS[0] });
    expect(updateMany.mock.calls[0][0].where.createdAt.lt).toBeInstanceOf(Date);
  });
});
