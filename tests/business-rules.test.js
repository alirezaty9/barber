import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import {
  TIME_SLOTS, SLOT_STEP_MIN, PENDING_HOLD_MINUTES, PENDING_HOLD_MS,
  CATEGORY_LABELS, STATUS_LABELS, PAYMENT_LABELS, STATUS_STYLES, PAYMENT_STYLES,
} from '@/lib/constants';
import { CATEGORIES, STATUSES, MAX_BOOKING_ADVANCE_DAYS, MAX_SERVICES_PER_BOOKING } from '@/lib/validation';

// ─────────────────────────────────────────────────────────────
//  قواعدِ کسب‌وکار و هماهنگیِ واژگان.
//
//  این تست‌ها منطقِ اجرایی را نمی‌سنجند؛ **قرارداد** را می‌سنجند. مثلاً اینکه هر وضعیتی
//  که سرور می‌پذیرد در پنل هم یک برچسبِ فارسی داشته باشد. شکستنِ این قراردادها هیچ خطای
//  برنامه‌نویسی نمی‌دهد — فقط جایی از رابطِ کاربری خالی یا «نامشخص» نشان می‌دهد و کسی
//  تا ماه‌ها متوجه نمی‌شود.
// ─────────────────────────────────────────────────────────────

/** دقیقه‌ی روز از رشته‌ی HH:MM. */
const minutesOf = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

describe('شبکه‌ی ساعت‌های کاری', () => {
  it('هیچ ساعتی تکراری نیست', () => {
    expect(new Set(TIME_SLOTS).size).toBe(TIME_SLOTS.length);
  });

  it('همه‌ی ساعت‌ها قالبِ HH:MM دارند', () => {
    for (const t of TIME_SLOTS) expect(t).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
  });

  it('ساعت‌ها صعودی مرتب‌اند', () => {
    const mins = TIME_SLOTS.map(minutesOf);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
  });

  // 🔴 مهم‌ترین قیدِ این بخش: اگر فاصله‌ها به‌هم بخورد، دو نوبت روی هم می‌افتند و
  // آرایشگر هم‌زمان دو مشتری خواهد داشت — بدونِ اینکه سیستم چیزی بفهمد.
  it('فاصله‌ی هر دو ساعتِ پشتِ‌سرِهم دقیقاً برابرِ مدتِ یک نوبت است', () => {
    for (let i = 1; i < TIME_SLOTS.length; i++) {
      expect(minutesOf(TIME_SLOTS[i]) - minutesOf(TIME_SLOTS[i - 1])).toBe(SLOT_STEP_MIN);
    }
  });

  it('مدتِ نوبت ۷۵ دقیقه است — مستقل از تعدادِ خدمات', () => {
    expect(SLOT_STEP_MIN).toBe(75);
  });

  it('آخرین نوبت پیش از ساعتِ ۲۲:۰۰ تمام می‌شود', () => {
    const last = TIME_SLOTS[TIME_SLOTS.length - 1];
    expect(minutesOf(last) + SLOT_STEP_MIN).toBeLessThanOrEqual(22 * 60);
  });

  it('نوبتِ بعدی از آخرین اسلات، از ساعتِ ۲۲:۰۰ عبور می‌کرد — یعنی شبکه کامل است', () => {
    const last = TIME_SLOTS[TIME_SLOTS.length - 1];
    expect(minutesOf(last) + 2 * SLOT_STEP_MIN).toBeGreaterThan(22 * 60);
  });
});

describe('مهلتِ نگه‌داشتِ رزروِ پرداخت‌نشده', () => {
  it('میلی‌ثانیه و دقیقه با هم می‌خوانند (یک منبعِ حقیقت)', () => {
    expect(PENDING_HOLD_MS).toBe(PENDING_HOLD_MINUTES * 60 * 1000);
  });

  // پنجره‌ی پرداختِ خودِ درگاه حدودِ ۱۵ دقیقه است. اگر مهلتِ ما کوتاه‌تر یا برابر باشد،
  // مشتری‌ای که پرداختش با رمزِ پویا طول می‌کشد اسلاتش را از دست می‌دهد و پولش گیر می‌کند.
  it('از پنجره‌ی پرداختِ درگاه بیشتر است', () => {
    expect(PENDING_HOLD_MINUTES).toBeGreaterThan(15);
  });
});

describe('سقف‌های رزرو', () => {
  it('رزرو حداکثر تا یک هفته‌ی آینده', () => {
    expect(MAX_BOOKING_ADVANCE_DAYS).toBe(7);
  });

  it('انتخابگرِ روز دقیقاً همین بازه را نشان می‌دهد (امروز + سقف)', () => {
    // DayPicker با days={8} صدا زده می‌شود ⇒ offsetهای ۰ تا ۷.
    const src = readFileSync(new URL('../src/components/ui/DayPicker.jsx', import.meta.url), 'utf8');
    const def = src.match(/days\s*=\s*(\d+)/);
    expect(def).not.toBeNull();
    expect(Number(def[1])).toBe(MAX_BOOKING_ADVANCE_DAYS + 1);
  });

  it('سقفِ خدماتِ یک نوبت معقول است', () => {
    expect(MAX_SERVICES_PER_BOOKING).toBeGreaterThan(1);
    expect(MAX_SERVICES_PER_BOOKING).toBeLessThanOrEqual(20);
  });
});

// 🔴 این بخش همان کلاسِ باگی را می‌گیرد که در بازبینی پیدا شد: وضعیتی که سرور
// می‌پذیرد ولی پنل برچسبی برایش ندارد و کاربر «نامشخص» می‌بیند.
describe('هماهنگیِ واژگان بینِ سرور و پنل', () => {
  it('هر وضعیتِ نوبت که سرور می‌پذیرد، برچسبِ فارسی دارد', () => {
    for (const s of STATUSES) expect(STATUS_LABELS[s], `برچسبِ «${s}» نیست`).toBeTruthy();
  });

  it('هر وضعیتِ نوبت استایلِ بَج دارد', () => {
    for (const s of STATUSES) expect(STATUS_STYLES[s], `استایلِ «${s}» نیست`).toBeTruthy();
  });

  it('برچسب‌های اضافی وجود ندارند (وضعیتی که دیگر پشتیبانی نمی‌شود)', () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...STATUSES].sort());
  });

  it('هر دسته‌ی خدمت که سرور می‌پذیرد، نامِ فارسی دارد', () => {
    for (const c of CATEGORIES) expect(CATEGORY_LABELS[c], `نامِ دسته‌ی «${c}» نیست`).toBeTruthy();
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual([...CATEGORIES].sort());
  });

  it('هر وضعیتِ پرداخت برچسب و استایل دارد', () => {
    const PAYMENT_STATES = ['unpaid', 'paid', 'failed', 'refunded', 'refundPending'];
    for (const p of PAYMENT_STATES) {
      expect(PAYMENT_LABELS[p], `برچسبِ «${p}» نیست`).toBeTruthy();
      expect(PAYMENT_STYLES[p], `استایلِ «${p}» نیست`).toBeTruthy();
    }
    expect(Object.keys(PAYMENT_LABELS).sort()).toEqual([...PAYMENT_STATES].sort());
  });

  it('برچسب‌ها یکتا هستند — دو وضعیتِ متفاوت یک اسم ندارند', () => {
    const labels = Object.values(PAYMENT_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
    const s = Object.values(STATUS_LABELS);
    expect(new Set(s).size).toBe(s.length);
  });

  it('املای «تأیید» در کلِ برچسب‌ها یکسان است (با همزه)', () => {
    for (const label of Object.values(STATUS_LABELS)) {
      expect(label).not.toMatch(/تایید/); // شکلِ بدونِ همزه ممنوع است
    }
  });
});

// این تست از خودِ فایلِ اسکیما می‌خواند. هدفش گرفتنِ حالتی است که کسی یک وضعیتِ جدید به
// کد اضافه کند و توضیحِ دیتابیس را به‌روز نکند — و نفرِ بعدی روی سندِ کهنه حساب کند.
describe('هماهنگیِ کد با توضیحاتِ اسکیمای دیتابیس', () => {
  const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');

  it('فهرستِ وضعیتِ نوبت در اسکیما با کد یکی است', () => {
    const line = schema.split('\n').find((l) => l.includes('status') && l.includes('@default("pending")'));
    expect(line).toBeTruthy();
    for (const s of STATUSES) expect(line).toContain(s);
  });

  it('فهرستِ وضعیتِ پرداخت در اسکیما با کد یکی است', () => {
    const line = schema.split('\n').find((l) => l.includes('paymentStatus') && l.includes('@default("unpaid")'));
    expect(line).toBeTruthy();
    for (const p of Object.keys(PAYMENT_LABELS)) expect(line).toContain(p);
  });

  it('فهرستِ دسته‌های خدمت در اسکیما با کد یکی است', () => {
    const line = schema.split('\n').find((l) => l.includes('category') && l.includes('@default("hair")'));
    expect(line).toBeTruthy();
    for (const c of CATEGORIES) expect(line).toContain(c);
  });
});
