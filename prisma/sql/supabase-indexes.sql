-- ══════════════════════════════════════════════════════════════════
--  ایندکس‌های موردنیاز روی دیتابیسِ Supabase (پروداکشن).
--  این کلِ فایل را در Supabase → SQL Editor پیست و Run کن (یک‌بار).
--
--  نام‌ها دقیقاً مطابقِ قراردادِ Prisma انتخاب شده‌اند تا اگر بعداً
--  `prisma db push` هم زدی، دوباره ساخته نشوند.
-- ══════════════════════════════════════════════════════════════════

-- ── (اختیاری ولی مهم) ابتدا چک کن رزروِ تکراریِ فعال روی یک اسلات نداشته باشی.
--    اگر این کوئری ردیفی برگرداند، قبل از ساختِ ایندکسِ یکتا باید تکراری‌ها را
--    (لغو یا حذف) پاک کنی وگرنه ساختِ ایندکس با خطا متوقف می‌شود.
-- SELECT "barberId", "date", "timeSlot", COUNT(*)
--   FROM "Booking" WHERE status <> 'cancelled'
--   GROUP BY "barberId", "date", "timeSlot" HAVING COUNT(*) > 1;

-- ── ۱) ایندکس‌های پرفورمنسِ فهرست/جست‌وجوی ادمین
CREATE INDEX IF NOT EXISTS "Booking_date_timeSlot_idx"
  ON "Booking" ("date", "timeSlot");

CREATE INDEX IF NOT EXISTS "Booking_status_idx"
  ON "Booking" ("status");

-- ── ۲) ایندکسِ یکتای شرطی: قلبِ جلوگیری از double-booking
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_slot"
  ON "Booking" ("barberId", "date", "timeSlot")
  WHERE status <> 'cancelled';
