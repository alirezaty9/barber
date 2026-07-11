// ساعات کاری آرایشگاه — هر اسلات یک ساعت فاصله دارد.
export const TIME_SLOTS = [
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

// گام زمانی بین اسلات‌ها (دقیقه) — برای محاسبه‌ی تداخل با مدت‌زمان خدمت.
export const SLOT_STEP_MIN = 60;

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
