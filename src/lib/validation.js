import { z } from 'zod';
import { normalizeDigits } from './persian';

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

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاریخ نامعتبر است.' });

const timeSlot = z
  .string()
  .regex(/^\d{2}:\d{2}$/, { message: 'ساعت نامعتبر است.' });

export const serviceSchema = z.object({
  name: z.string().trim().min(1, 'عنوان خدمت الزامی است.'),
  price: z.coerce.number().int().positive('قیمت باید بزرگ‌تر از صفر باشد.'),
  duration: z.coerce.number().int().positive('مدت زمان باید بزرگ‌تر از صفر باشد.'),
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
  date: isoDate,
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
