import { TIME_SLOTS } from './constants';

export function timeToMin(hhmm) {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/**
 * محاسبه‌ی وضعیت هر اسلات برای یک روز مشخص.
 *
 * 🔒 سیاستِ قطعیِ آرایشگاه (تأییدشده توسطِ صاحبِ مجموعه در ۱۴۰۵/۰۶/۲۸):
 * هر نوبت دقیقاً «یک اسلات» می‌گیرد و یک اسلات ۷۵ دقیقه است (SLOT_STEP_MIN در constants.js).
 * این مقدار **مستقل از تعدادِ خدمات** است: چه فقط مو، چه فقط ریش، چه مو و ریش با هم —
 * در هر حالت همان ۷۵ دقیقه. پس مدتِ خدمات (duration) در محاسبه‌ی موجودی هیچ نقشی ندارد و
 * رزرو/بستنِ یک اسلات فقط همان اسلات را اشغال می‌کند، نه اسلات‌های بعدی را.
 *
 * ⚠️ برای نفرِ بعدی: این «فراموش‌شدنِ جمعِ مدتِ خدمات» نیست، یک تصمیمِ آگاهانه‌ی کسب‌وکاری
 * است. اگر روزی دیدی مجموعِ duration خدمات از ۷۵ دقیقه بیشتر می‌شود و خواستی «درستش کنی»،
 * اول با صاحبِ مجموعه چک کن — چون رفتارِ فعلی عمدی و خواسته‌شده است.
 *
 * تعطیلیِ روز فقط از طریق «بستن کل‌روز» (فیچر مرخصی) تعیین می‌شود.
 *
 * @param {object} p
 * @param {{timeSlot: string}[]} p.existing نوبت‌های فعالِ همان آرایشگر/روز
 * @param {{timeSlot: string|null}[]} [p.blocks] بستن‌های زمان (مرخصی): timeSlot=null یعنی کل روز
 * @param {number} [p.nowMinutes] اگر روزِ انتخابی «امروز» باشد، دقیقه‌ی فعلیِ روز؛ اسلات‌های
 *   گذشته غیرقابل‌انتخاب می‌شوند. مقدار -1 یعنی روزِ آینده (بدون محدودیت زمانی).
 * @param {boolean} [p.isWorkingDay] آیا این روز جزوِ روزهای کاریِ آرایشگر است؟ اگر نه، کل روز تعطیل.
 * @returns {{ dayOff: boolean, slots: {time: string, available: boolean, reason?: string}[] }}
 */
export function computeAvailability({ existing, blocks = [], nowMinutes = -1, isWorkingDay = true }) {
  // تعطیلیِ روز: یا «بستنِ کل‌روز» (بلاکی بدون ساعت) یا «روزِ غیرکاریِ آرایشگر» (workDays).
  const fullDayBlocked = blocks.some((b) => !b.timeSlot);
  if (fullDayBlocked || !isWorkingDay) {
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
