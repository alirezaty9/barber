-- ══════════════════════════════════════════════════════════════════
--  ایندکس‌هایی که Prisma نمی‌تواند از روی schema.prisma بسازد.
--
--  🖥️ اجرا (یک‌بار، روی همان دیتابیسی که DATABASE_URL به آن اشاره می‌کند):
--        npm run db:index
--     یا این فایل را در کنسولِ SQL دیتابیسِ هاست پیست و Run کن.
--
--  ⚠️ ترتیب: اول `npm run db:push` (تا جدول‌ها ساخته شوند)، بعد این.
--
--  همه‌ی دستورها با IF NOT EXISTS نوشته شده‌اند، پس اجرای دوباره‌شان بی‌خطر است.
-- ══════════════════════════════════════════════════════════════════

-- ── ایندکسِ یکتای شرطی: قلبِ جلوگیری از رزروِ تکراری (double-booking) ──
--
--  چرا لازم است؟ چکِ موجودی داخلِ تراکنش «کمکی» است، ولی تضمینِ قطعی نمی‌دهد —
--  مخصوصاً وقتی اتصالِ اپ به دیتابیس از یک واسطه (connection pooler) رد می‌شود.
--  این ایندکس در سطحِ خودِ Postgres مانع می‌شود دو رزروِ «فعال» (غیرلغوشده) روی یک
--  (آرایشگر، تاریخ، ساعت) وجود داشته باشد. رزروِ لغوشده شرطِ WHERE را نمی‌گذراند،
--  پس همان اسلات دوباره قابلِ رزرو می‌ماند.
--
--  Prisma این نوع ایندکس (partial unique index) را در schema.prisma پشتیبانی نمی‌کند،
--  برای همین اینجا دستی نوشته شده است.
--
--  🆘 اگر این دستور با خطای «could not create unique index» متوقف شد، یعنی از قبل
--     دو رزروِ فعال روی یک اسلات داری. اول با کوئریِ زیر پیدایشان کن و یکی را لغو کن:
--
--        SELECT "barberId", "date", "timeSlot", COUNT(*)
--          FROM "Booking" WHERE status <> 'cancelled'
--          GROUP BY "barberId", "date", "timeSlot" HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_slot"
  ON "Booking" ("barberId", "date", "timeSlot")
  WHERE status <> 'cancelled';

-- ── ایندکس‌های پرفورمنسِ فهرست/جست‌وجوی ادمین ──
--
--  این دو از روی @@index در schema.prisma هم ساخته می‌شوند، پس بعد از `db:push`
--  معمولاً از قبل وجود دارند. اینجا هم آمده‌اند تا اگر کسی این فایل را دستی و
--  بدونِ db:push روی دیتابیس اجرا کرد، چیزی جا نیفتد. (نام‌ها دقیقاً مطابقِ قراردادِ
--  Prisma است تا دوباره‌کاری نشود.)

CREATE INDEX IF NOT EXISTS "Booking_date_timeSlot_idx"
  ON "Booking" ("date", "timeSlot");

CREATE INDEX IF NOT EXISTS "Booking_status_idx"
  ON "Booking" ("status");
