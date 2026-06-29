# پیرایش رویال — سامانه‌ی رزرو نوبت آرایشگاه (فول‌استک)

اپلیکیشن رزرو آنلاین نوبت آرایشگاه با **Next.js (App Router) + JavaScript** (بدون TypeScript)، **Tailwind CSS v4**، **Prisma + SQLite**، احراز هویت ادمین، و تقویم شمسی.

## امکانات
- صفحه‌ی فرود با کاتالوگ خدمات/آرایشگران/نظرات از دیتابیس.
- ویزارد رزرو ۴ مرحله‌ای با **تقویم شمسی** و بررسی **تداخل و مدت‌زمان خدمت** سمت سرور.
- **کد رهگیری** برای مشتری + صفحه‌ی `/track` برای مشاهده و **لغو نوبت**.
- پنل مدیریت محافظت‌شده: داشبورد، مدیریت نوبت‌ها (فیلتر/جست‌وجو/صفحه‌بندی)، ثبت نوبت دستی، و CRUD کامل خدمات و آرایشگران.
- احراز هویت ادمین با رمز عبور + کوکی امضاشده (JWT) و محافظت با middleware.
- داده‌ی سرور با **TanStack Query**، state کلاینت با **Zustand**، فرم‌ها با **React Hook Form + Zod**.
- UX دسترس‌پذیر: مودال Radix (focus-trap/Esc/قفل اسکرول)، Toast (sonner) به‌جای alert، دیالوگ تایید به‌جای confirm.

## پیش‌نیاز
- Node.js نسخه‌ی ۱۸.۱۸ یا بالاتر

## راه‌اندازی
```bash
# ۱) نصب وابستگی‌ها (postinstall به‌صورت خودکار prisma generate را اجرا می‌کند)
npm install

# ۲) ساخت فایل env
cp .env.example .env
#   سپس مقادیر ADMIN_PASSWORD و SESSION_SECRET را در .env تنظیم کن.

# ۳) ساخت دیتابیس و دادهٔ اولیه
npm run db:migrate     # ساخت جداول (prisma migrate dev)
npm run db:seed        # ریختن داده‌های اولیه

# ۴) اجرا
npm run dev            # http://localhost:3000
```

ورود به پنل: به `/admin/login` برو و رمز `ADMIN_PASSWORD` را وارد کن.

## بیلد پروداکشن
```bash
npm run build
npm run start
```

## دیپلوی (مثلاً Vercel)
SQLite روی محیط سرورلس فایل‌سیستم نوشتنی ندارد. برای پروداکشن:
1. در `prisma/schema.prisma` مقدار `provider` را به `postgresql` تغییر بده.
2. `DATABASE_URL` را به یک Postgres ابری (Neon/Supabase) وصل کن.
3. `npx prisma migrate deploy` و سپس `npm run db:seed` (یک‌بار).

## ساختار پوشه‌ها
```
app/
  layout.jsx, page.jsx, providers.jsx        # ریشه + لندینگ (Server Component)
  loading/error/not-found/global-error.jsx   # حالت‌های UI
  track/page.jsx                             # رهگیری/لغو نوبت مشتری
  admin/login/page.jsx                       # ورود ادمین (خارج از چِرم پنل)
  admin/(panel)/...                          # داشبورد، bookings، manual، manage (محافظت‌شده)
  api/...                                     # Route Handlerها (services/barbers/bookings/reviews/admin)
middleware.js                                # گارد /admin/**
prisma/schema.prisma, seed.js                # مدل‌ها و داده‌ی اولیه
src/
  features/{landing,booking,admin}/          # کامپوننت‌های هر فیچر
  components/ui/                             # کیت UI مشترک
  api/                                        # fetcher + هوک‌های React Query
  lib/                                        # db, auth, jwt, validation, persian, availability, ...
```
