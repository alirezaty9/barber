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
  hair: 'اصلاح مو',
  beard: 'اصلاح ریش',
  grooming: 'پاکسازی و گریم',
  groom: 'گریم داماد',
  combo: 'پکیج ویژه',
};

export const STATUS_LABELS = {
  pending: 'منتظر تایید',
  confirmed: 'تایید شده',
  cancelled: 'لغو شده',
};
