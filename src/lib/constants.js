// ساعات کاری آرایشگاه — هر نوبت «یک ساعت و ربع» (۷۵ دقیقه) طول می‌کشد،
// پس اسلات‌ها ۷۵ دقیقه‌به‌۷۵ دقیقه از ۱۰:۰۰ تا ۲۰:۰۰ چیده شده‌اند.
export const TIME_SLOTS = [
  '10:00',
  '11:15',
  '12:30',
  '13:45',
  '15:00',
  '16:15',
  '17:30',
  '18:45',
  '20:00',
];

// گام زمانی بین اسلات‌ها (دقیقه) — یک ساعت و ربع.
export const SLOT_STEP_MIN = 75;

export const CATEGORY_LABELS = {
  hair: 'هیرکات',
  beard: 'ریش',
  grooming: 'پاکسازی و گریم',
  groom: 'گریم داماد',
  combo: 'پکیج ویژه',
  style: 'استایل',
};

export const STATUS_LABELS = {
  pending: 'منتظر تایید',
  confirmed: 'تایید شده',
  cancelled: 'لغو شده',
};

export const PAYMENT_LABELS = {
  unpaid: 'پرداخت‌نشده',
  paid: 'پرداخت‌شده',
  failed: 'ناموفق',
  refunded: 'مسترد شده',
  refundPending: 'در انتظار استرداد',
};

// کلاس‌های استایل بَج‌ها — متمرکز تا در چند صفحه تکرار نشوند.
export const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export const PAYMENT_STYLES = {
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  unpaid: 'bg-zinc-700/20 text-zinc-400 border-zinc-700/40',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  refunded: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  refundPending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
