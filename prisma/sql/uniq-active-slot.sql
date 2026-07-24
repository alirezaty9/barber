-- ══════════════════════════════════════════════════════════════════
--  ایندکسِ یکتای شرطی (partial unique index) برای جلوگیریِ قطعیِ double-booking.
--
--  چرا لازم است؟ چک‌کردنِ موجودی داخلِ تراکنشِ Serializable «کمکی» است، ولی روی
--  pgBouncer (پورت 6543) تضمینِ کامل نمی‌دهد. این ایندکس در سطحِ خودِ Postgres مانع
--  می‌شود دو رزروِ «فعال» (غیرلغوشده) روی یک (آرایشگر، تاریخ، ساعت) وجود داشته باشد.
--  رزروِ لغوشده شرط (WHERE) را نمی‌گذراند، پس همان اسلات دوباره قابلِ رزرو می‌ماند.
--
--  Prisma این نوع ایندکس را در schema.prisma پشتیبانی نمی‌کند؛ پس دستی اجرا می‌شود.
--
--  🖥️ نحوه‌ی اجرا (یک‌بار، روی همان دیتابیسِ پروداکشن):
--     npx prisma db execute --file prisma/sql/uniq-active-slot.sql --schema prisma/schema.prisma
--  یا این SQL را در SQL Editorِ Supabase paste و Run کن.
-- ══════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_slot"
  ON "Booking" ("barberId", "date", "timeSlot")
  WHERE status <> 'cancelled';
