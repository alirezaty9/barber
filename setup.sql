-- ════════════════════════════════════════════════════════════════════════
--  راه‌اندازی کامل دیتابیس روی Supabase (ساخت جدول‌ها + داده‌ی اولیه)
--  این فایل را در: Supabase → SQL Editor → New query → Paste → Run اجرا کن.
--  (روی HTTPS کار می‌کند و فیلتر/تحریم پورت دیتابیس را دور می‌زند.)
--  اجرای دوباره بی‌خطر است (اول جدول‌ها را drop می‌کند).
-- ════════════════════════════════════════════════════════════════════════

-- پاک‌سازی برای اجرای تکراریِ بی‌خطر
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Review"  CASCADE;
DROP TABLE IF EXISTS "Service" CASCADE;
DROP TABLE IF EXISTS "Barber"  CASCADE;

-- ───────── جدول‌ها (دقیقاً مطابق schema.prisma) ─────────

CREATE TABLE "Service" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "price"       INTEGER NOT NULL,
  "duration"    INTEGER NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "category"    TEXT NOT NULL DEFAULT 'hair',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Barber" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "specialty" TEXT NOT NULL DEFAULT '',
  "avatar"    TEXT NOT NULL DEFAULT '',
  "rating"    DOUBLE PRECISION NOT NULL DEFAULT 5,
  "bio"       TEXT NOT NULL DEFAULT '',
  "image"     TEXT NOT NULL DEFAULT '',
  "workDays"  TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Booking" (
  "id"            TEXT PRIMARY KEY,
  "code"          TEXT NOT NULL,
  "customerName"  TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "serviceId"     TEXT,
  "serviceId2"    TEXT,
  "barberId"      TEXT,
  "date"          TEXT NOT NULL,
  "timeSlot"      TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_code_key" UNIQUE ("code"),
  CONSTRAINT "Booking_serviceId_fkey"  FOREIGN KEY ("serviceId")  REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Booking_serviceId2_fkey" FOREIGN KEY ("serviceId2") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Booking_barberId_fkey"   FOREIGN KEY ("barberId")   REFERENCES "Barber"("id")  ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "Booking_barberId_date_idx" ON "Booking"("barberId", "date");

CREATE TABLE "Review" (
  "id"           TEXT PRIMARY KEY,
  "customerName" TEXT NOT NULL,
  "rating"       DOUBLE PRECISION NOT NULL,
  "comment"      TEXT NOT NULL,
  "date"         TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ───────── داده‌ی اولیه (همان seed.js) ─────────

INSERT INTO "Barber" ("id","name","specialty","avatar","rating","bio","image","workDays") VALUES
 ('b1','سهراب امینی','متخصص هیرکات مدرن و فید','/images/barber-b1-avatar.jpg',4.9,'سهراب با بیش از ۸ سال تجربه در زمینه انواع هیرکات‌های مدرن و استایل‌های ژورنالی، تخصص ویژه‌ای در اجرای فید‌های دقیق و کارهای خلاقانه دارد.','/images/barber-b1.jpg','0,1,2,3,4,6'),
 ('b2','آرش راد','استایلیست کلاسیک و گریم تخصصی','/images/barber-b2-avatar.jpg',4.8,'آرش استاد اجرای مدل‌های کلاسیک، قیچی‌کاری‌های حرفه‌ای و گریم داماد است. ظرافت و حوصله در کار، امضای اوست.','/images/barber-b2.jpg','0,1,2,4,5'),
 ('b3','کیان مهرزاد','طراح ریش و خط زن حرفه‌ای','/images/barber-b3-avatar.jpg',4.95,'اگر به دنبال یک استایل ریش بی‌نقص و طراحی متناسب با آناتومی صورت خود هستید، کیان با اصلاح‌های گرم با حوله داغ بهترین انتخاب شماست.','/images/barber-b3.jpg','0,1,2,3,4,5');

INSERT INTO "Service" ("id","name","price","duration","description","category") VALUES
 ('s1','اصلاح مو مدرن (هیرکات و فید)',320000,45,'شستشو با شامپوی حرفه‌ای، اصلاح مو متناسب با آناتومی چهره، سشوار و حالت‌دهی با محصولات پریمیوم.','hair'),
 ('s2','اصلاح و طراحی ریش مدرن',180000,30,'اصلاح کلاسیک با حوله داغ، استفاده از روغن ریش لوکس، طراحی دقیق خط ریش و فرم‌دهی متناسب با مو.','beard'),
 ('s3','پکیج رویال (هیرکات + ریش + گریم صورت)',650000,90,'کامل‌ترین خدمات شامل هیرکات مدرن، اصلاح ریش، پاکسازی و ماسک حبابی صورت، ماساژ سر و ریلکسیشن شانه.','combo'),
 ('s4','پاکسازی و آبرسانی پوست',250000,45,'لایه‌برداری عمیق پوست، از بین بردن جوش‌های سرسیاه، آبرسانی با بخور سرد و ماسک ورقه‌ای مغذی پوست.','grooming'),
 ('s5','اصلاح مو کلاسیک قیچی',280000,40,'اصلاح کامل سنتی فقط با قیچی و شانه بدون استفاده از ماشین، همراه با ماساژ و شستشو.','hair'),
 ('s6','گریم داماد',850000,120,'پکیج کامل آراستگی داماد در روز مراسم: اصلاح و حالت‌دهی مو، پیرایش و فرم‌دهی ریش، پاکسازی و گریم تخصصی صورت و آماده‌سازی نهایی ظاهر.','groom');

INSERT INTO "Review" ("id","customerName","rating","comment","date") VALUES
 ('r1','علیرضا عبادی',5,'دکور فوق‌العاده شیک، برخورد پرسنل عالی و کیفیت هیرکات سهراب بی‌نظیر بود. حتما باز هم میام.','۱۴۰۵/۰۴/۰۵'),
 ('r2','پوریا رضایی',4.8,'طراحی ریش کیان فوق‌العاده با وسواس و تمیز بود. استفاده از حوله داغ و ماساژ حس خوبی داشت.','۱۴۰۵/۰۴/۰۳'),
 ('r3','امین حسینی',5,'پکیج رویال رو رزرو کردم و واقعاً فراتر از انتظارم بود. پوست کل صورتم شاداب شد و اصلاح مو هم درجه یک بود.','۱۴۰۵/۰۴/۰۱');

-- نوبت‌های نمونه (تاریخ‌ها نسبت به امروز، مثل seed)
INSERT INTO "Booking" ("id","code","customerName","customerPhone","serviceId","barberId","date","timeSlot","status") VALUES
 ('bk1','BK1001','رضا علوی','09121112233','s1','b1', to_char(CURRENT_DATE,   'YYYY-MM-DD'),'11:00','confirmed'),
 ('bk2','BK1002','محمد احمدی','09194445566','s2','b3', to_char(CURRENT_DATE,   'YYYY-MM-DD'),'14:00','confirmed'),
 ('bk3','BK1003','سامان کریمی','09107778899','s3','b2', to_char(CURRENT_DATE+1, 'YYYY-MM-DD'),'16:00','pending'),
 ('bk4','BK1004','مهران شکیبا','09351234567','s4','b1', to_char(CURRENT_DATE+1, 'YYYY-MM-DD'),'18:00','pending');

-- ✅ تمام. حالا اپ روی Vercel می‌تواند به این جدول‌ها وصل شود.
