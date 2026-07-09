import { TIME_SLOTS, SLOT_STEP_MIN } from './constants';

const CLOSING_MIN = timeToMin(TIME_SLOTS[TIME_SLOTS.length - 1]) + SLOT_STEP_MIN;

export function timeToMin(hhmm) {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * محاسبه‌ی وضعیت هر اسلات برای یک روز مشخص، با لحاظ مدت‌زمان خدمت و بستن‌های زمان.
 * تعطیلیِ روز فقط از طریق «بستن کل‌روز» (فیچر مرخصی) تعیین می‌شود؛ محدودیتِ روزهای
 * هفتگی حذف شده تا مدیریت تعطیلی یکجا و ساده باشد.
 *
 * @param {object} p
 * @param {number} p.serviceDuration مدت خدمت موردنظر (دقیقه)
 * @param {{timeSlot: string, duration: number}[]} p.existing نوبت‌های فعالِ همان آرایشگر/روز
 * @param {{timeSlot: string|null}[]} [p.blocks] بستن‌های زمان (مرخصی): timeSlot=null یعنی کل روز
 * @param {number} [p.nowMinutes] اگر روزِ انتخابی «امروز» باشد، دقیقه‌ی فعلیِ روز؛ اسلات‌های
 *   گذشته (تا این لحظه) غیرقابل‌انتخاب می‌شوند. مقدار -1 یعنی روزِ آینده (بدون محدودیت زمانی).
 * @returns {{ dayOff: boolean, slots: {time: string, available: boolean, reason?: string}[] }}
 */
export function computeAvailability({ serviceDuration, existing, blocks = [], nowMinutes = -1 }) {
  const duration = serviceDuration || SLOT_STEP_MIN;

  // بستنِ کل‌روز (بلاکی بدون ساعت) → کل روز تعطیل.
  const fullDayBlocked = blocks.some((b) => !b.timeSlot);
  if (fullDayBlocked) {
    return {
      dayOff: true,
      slots: TIME_SLOTS.map((time) => ({ time, available: false, reason: 'dayoff' })),
    };
  }

  // ساعت‌های بسته‌شده (مرخصیِ ساعتی) — هم برچسب می‌گیرند و هم مثل نوبتِ اشغال، مانع خدمتِ کِش‌دار می‌شوند.
  const blockedSlots = new Set(blocks.filter((b) => b.timeSlot).map((b) => b.timeSlot));
  const busy = [
    ...existing.map((b) => {
      const start = timeToMin(b.timeSlot);
      return [start, start + (b.duration || SLOT_STEP_MIN)];
    }),
    ...[...blockedSlots].map((t) => {
      const start = timeToMin(t);
      return [start, start + SLOT_STEP_MIN];
    }),
  ];

  const slots = TIME_SLOTS.map((time) => {
    const start = timeToMin(time);
    const end = start + duration;

    if (end > CLOSING_MIN) {
      return { time, available: false, reason: 'closing' };
    }
    // اگر امروز است، ساعت‌هایی که تا این لحظه گذشته‌اند قابل رزرو نیستند.
    if (nowMinutes >= 0 && start <= nowMinutes) {
      return { time, available: false, reason: 'past' };
    }
    if (blockedSlots.has(time)) {
      return { time, available: false, reason: 'blocked' };
    }
    const clash = busy.some(([bs, be]) => overlap(start, end, bs, be));
    return { time, available: !clash, reason: clash ? 'booked' : undefined };
  });

  return { dayOff: false, slots };
}
