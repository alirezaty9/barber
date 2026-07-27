// ساعات کاری آرایشگاه — هر نوبت «یک ساعت و ربع» (۷۵ دقیقه) طول می‌کشد.
// اسلات‌ها ۷۵ دقیقه‌به‌۷۵ دقیقه از ۰۹:۰۰ چیده شده‌اند و آخرین نوبت طوری است که
// تا ساعتِ ۲۲:۰۰ (۱۰ شب) تمام شود؛ پس نوبتِ بعد از ۲۰:۱۵ (که تا ۲۱:۳۰ طول می‌کشد)
// داده نمی‌شود چون به بعد از ۱۰ شب می‌افتد.
export const TIME_SLOTS = [
  '09:00',
  '10:15',
  '11:30',
  '12:45',
  '14:00',
  '15:15',
  '16:30',
  '17:45',
  '19:00',
  '20:15',
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
