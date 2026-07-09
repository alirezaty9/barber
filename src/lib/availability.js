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
 * نگاشت روزِ هفته‌ی جاوااسکریپت (0=یکشنبه ... 6=شنبه) به اندیس workDays فارسی
 * (0=شنبه، 1=یکشنبه ... 6=جمعه).
 */
export function jsDayToPersianIndex(jsDay) {
  return jsDay === 6 ? 0 : jsDay + 1;
}

export function isBarberWorkingOnDate(workDays, isoDate) {
  const jsDay = new Date(isoDate + 'T00:00:00').getDay();
  return workDays.includes(jsDayToPersianIndex(jsDay));
}

/**
 * محاسبه‌ی وضعیت هر اسلات برای یک آرایشگر در یک روز مشخص، با لحاظ مدت‌زمان خدمت.
 *
 * @param {object} p
 * @param {number} p.serviceDuration مدت خدمت موردنظر (دقیقه)
 * @param {number[]} p.workDays روزهای کاری آرایشگر
 * @param {string} p.date تاریخ ISO (YYYY-MM-DD)
 * @param {{timeSlot: string, duration: number}[]} p.existing نوبت‌های فعالِ همان آرایشگر/روز
 * @param {{timeSlot: string|null}[]} [p.blocks] بستن‌های زمان (مرخصی): timeSlot=null یعنی کل روز
 * @returns {{ dayOff: boolean, slots: {time: string, available: boolean, reason?: string}[] }}
 */
export function computeAvailability({ serviceDuration, workDays, date, existing, blocks = [] }) {
  const duration = serviceDuration || SLOT_STEP_MIN;

  // روز غیرکاری یا بستنِ کل‌روز (بلاکی بدون ساعت) → کل روز تعطیل.
  const fullDayBlocked = blocks.some((b) => !b.timeSlot);
  if (!isBarberWorkingOnDate(workDays, date) || fullDayBlocked) {
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
    if (blockedSlots.has(time)) {
      return { time, available: false, reason: 'blocked' };
    }
    const clash = busy.some(([bs, be]) => overlap(start, end, bs, be));
    return { time, available: !clash, reason: clash ? 'booked' : undefined };
  });

  return { dayOff: false, slots };
}
