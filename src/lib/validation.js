import { z } from 'zod';
import { normalizeDigits } from './persian';
import { tehranTodayISO, shiftISO } from './time';

// حداکثر فاصله‌ی مجازِ رزرو از امروز (روز): فقط تا «یک هفته‌ی» آینده.
// این با تعدادِ روزهای نمایش‌داده‌شده در DayPicker (۸ روز = امروز + ۷) هماهنگ است.
export const MAX_BOOKING_ADVANCE_DAYS = 7;

// آیا رشته‌ی YYYY-MM-DD یک تاریخِ واقعیِ تقویمی است؟ (regex تنها «2026-13-45» را رد نمی‌کند.)
function isRealISODate(v) {
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export const CATEGORIES = ['hair', 'beard', 'grooming', 'groom', 'combo', 'style'];
export const STATUSES = ['pending', 'confirmed', 'cancelled'];

// شماره‌ی موبایل: ابتدا ارقام فارسی/عربی به انگلیسی نرمال می‌شود، سپس اعتبارسنجی.
// قالبِ معتبر: ۱۱ رقمی که با ۰۹ شروع شود.
const mobile = z
  .string()
  .transform((v) => normalizeDigits(v).trim())
  .refine((v) => /^09[0-9]{9}$/.test(v), {
    message: 'شماره موبایل باید ۱۱ رقمی و با ۰۹ شروع شود.',
  });

// کدِ تأییدِ ۶ رقمی (OTP) — ارقام فارسی/عربی هم پذیرفته و نرمال می‌شوند.
const otp = z
  .string()
  .transform((v) => normalizeDigits(v).trim())
  .refine((v) => /^[0-9]{6}$/.test(v), { message: 'کد تأیید باید ۶ رقمی باشد.' });

// تاریخِ ISO: هم قالب (regex) و هم صحتِ تقویمی چک می‌شود.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاریخ نامعتبر است.' })
  .refine(isRealISODate, { message: 'تاریخ نامعتبر است.' });

// تاریخِ رزرو: علاوه بر معتبربودن، نباید در گذشته یا دورتر از سقفِ مجاز باشد.
const bookingDate = isoDate
  .refine((v) => v >= shiftISO(tehranTodayISO(), -1), { message: 'تاریخِ گذشته قابلِ رزرو نیست.' })
  .refine((v) => v <= shiftISO(tehranTodayISO(), MAX_BOOKING_ADVANCE_DAYS), {
    message: 'این تاریخ خیلی دور است.',
  });

const timeSlot = z
  .string()
  .regex(/^\d{2}:\d{2}$/, { message: 'ساعت نامعتبر است.' });

export const serviceSchema = z.object({
  name: z.string().trim().min(1, 'عنوان خدمت الزامی است.'),
  price: z.coerce.number().int().positive('قیمت باید بزرگ‌تر از صفر باشد.'),
  // «مدت خدمت» از رابط کاربری حذف شده (هر نوبت ۱ ساعت و ربع ثابت است). ولی ستونِ
  // duration در دیتابیس اجباری است؛ پس اگر فرستاده نشد، پیش‌فرضِ ۷۵ دقیقه می‌گیرد.
  duration: z.coerce.number().int().positive().default(75),
  description: z.string().trim().default(''),
  category: z.enum(CATEGORIES),
});

// آدرس تصویر: هم URL کامل (https://...) و هم مسیر لوکال (/images/...) پذیرفته می‌شود.
const imageRef = z
  .string()
  .trim()
  .refine((v) => v === '' || /^https?:\/\//.test(v) || v.startsWith('/'), {
    message: 'آدرس تصویر نامعتبر است (باید با http یا / شروع شود).',
  })
  .default('');

export const barberSchema = z.object({
  name: z.string().trim().min(1, 'نام آرایشگر الزامی است.'),
  specialty: z.string().trim().default(''),
  avatar: imageRef,
  image: imageRef,
  rating: z.coerce.number().min(0).max(5).default(5),
  bio: z.string().trim().default(''),
  workDays: z.array(z.coerce.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
});

export const bookingSchema = z.object({
  customerName: z.string().trim().min(1, 'نام و نام خانوادگی الزامی است.'),
  customerPhone: mobile,
  // یک یا چند خدمت (بدون محدودیت تعداد).
  serviceIds: z.array(z.string().min(1)).min(1, 'حداقل یک خدمت انتخاب کنید.'),
  // آرایشگر اختیاری؛ چون تک‌آرایشگری است، اگر ارسال نشود سمت سرور همان آرایشگر انتخاب می‌شود.
  barberId: z.string().min(1).nullish(),
  date: bookingDate,
  timeSlot,
});

export const statusUpdateSchema = z.object({
  status: z.enum(STATUSES),
});

export const loginSchema = z.object({
  password: z.string().min(1, 'رمز عبور را وارد کنید.'),
});

// رهگیری نوبت فقط با شماره موبایل.
export const lookupSchema = z.object({
  phone: mobile,
});

// درخواستِ کدِ تأییدِ لغو: فقط با کدِ رهگیری؛ سرور OTP را به موبایلِ همان نوبت می‌فرستد.
export const cancelRequestSchema = z.object({
  code: z.string().trim().min(1, 'کد رهگیری نامعتبر است.'),
});

// لغو نوبت: کدِ رهگیری + کدِ تأییدِ دومرحله‌ای.
export const cancelSchema = z.object({
  code: z.string().trim().min(1, 'کد رهگیری نامعتبر است.'),
  otp,
});

// بستن زمان (مرخصی/تعطیلی): کل روز (fullDay=true، از date تا dateTo) یا ساعت‌های مشخص (slots).
export const blockSchema = z.object({
  barberId: z.string().min(1, 'انتخاب آرایشگر الزامی است.'),
  date: isoDate,
  dateTo: isoDate.nullish(),
  fullDay: z.boolean().default(false),
  slots: z.array(timeSlot).default([]),
  reason: z.string().trim().default(''),
});
