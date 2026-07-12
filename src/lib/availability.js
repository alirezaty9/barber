import { TIME_SLOTS } from './constants';

export function timeToMin(hhmm) {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/**
 * محاسبه‌ی وضعیت هر اسلات برای یک روز مشخص.
 *
 * سیاستِ آرایشگاه: هر نوبت دقیقاً «یک اسلات (۱ ساعت)» را می‌گیرد — مستقل از اینکه مشتری
 * ۱ خدمت انتخاب کند یا ۳ خدمت. پس مدتِ خدمات در محاسبه‌ی موجودی هیچ نقشی ندارد و رزرو/بستنِ
 * یک ساعت، فقط همان یک ساعت را اشغال می‌کند (نه ساعت‌های بعدی).
 *
 * تعطیلیِ روز فقط از طریق «بستن کل‌روز» (فیچر مرخصی) تعیین می‌شود.
 *
 * @param {object} p
 * @param {{timeSlot: string}[]} p.existing نوبت‌های فعالِ همان آرایشگر/روز
 * @param {{timeSlot: string|null}[]} [p.blocks] بستن‌های زمان (مرخصی): timeSlot=null یعنی کل روز
 * @param {number} [p.nowMinutes] اگر روزِ انتخابی «امروز» باشد، دقیقه‌ی فعلیِ روز؛ اسلات‌های
 *   گذشته غیرقابل‌انتخاب می‌شوند. مقدار -1 یعنی روزِ آینده (بدون محدودیت زمانی).
 * @returns {{ dayOff: boolean, slots: {time: string, available: boolean, reason?: string}[] }}
 */
export function computeAvailability({ existing, blocks = [], nowMinutes = -1 }) {
  // بستنِ کل‌روز (بلاکی بدون ساعت) → کل روز تعطیل.
  const fullDayBlocked = blocks.some((b) => !b.timeSlot);
  if (fullDayBlocked) {
    return {
      dayOff: true,
      slots: TIME_SLOTS.map((time) => ({ time, available: false, reason: 'dayoff' })),
    };
  }

  // مجموعه‌ی ساعت‌های اشغال‌شده: هر نوبت یا بستنِ ساعتی فقط «همان یک ساعت» را می‌گیرد.
  const bookedSlots = new Set(existing.map((b) => b.timeSlot));
  const blockedSlots = new Set(blocks.filter((b) => b.timeSlot).map((b) => b.timeSlot));

  const slots = TIME_SLOTS.map((time) => {
    // اگر امروز است، ساعت‌هایی که تا این لحظه گذشته‌اند قابل رزرو نیستند.
    if (nowMinutes >= 0 && timeToMin(time) <= nowMinutes) {
      return { time, available: false, reason: 'past' };
    }
    if (blockedSlots.has(time)) {
      return { time, available: false, reason: 'blocked' };
    }
    if (bookedSlots.has(time)) {
      return { time, available: false, reason: 'booked' };
    }
    return { time, available: true };
  });

  return { dayOff: false, slots };
}
