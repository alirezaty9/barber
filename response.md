<div dir="rtl" align="right">

![لوکال کانفیگ](https://img.shields.io/badge/%DA%A9%D8%A7%D9%86%D9%81%DB%8C%DA%AF%20%D9%84%D9%88%DA%A9%D8%A7%D9%84-%E2%9C%85%20%D8%AF%D8%B1%D8%B3%D8%AA%20(5432)-brightgreen) ![Vercel](https://img.shields.io/badge/Vercel-%D9%86%DB%8C%D8%A7%D8%B2%20%D8%A8%D9%87%20%DB%B2%20%D9%82%D8%AF%D9%85-orange) ![گیت](https://img.shields.io/badge/%D8%B1%D9%85%D8%B2%D9%87%D8%A7-%D8%A7%D9%85%D9%86-success)

# 🎯 «الان همه‌چی درسته؟» — جواب صادقانه + کارِ باقی‌مانده

## ✅ چیزی که تأیید شد
- پورت دیتابیس لوکال: **5432** ✅
- دیتابیس `barber` روی لوکال ساخته شده ✅
- پس **کانفیگ فایلِ لوکال ۱۰۰٪ درست است** و نیازی به تغییر `.env` نیست.

> ⚠️ اما **هنوز کامل آماده‌ی کار نیست.** پیکربندی فایل‌ها تمام است، ولی دو کارِ **داده‌ای** مانده که فقط تو (روی سیستم/داشبورد) می‌توانی انجام دهی. جدول‌ها و داده‌ها خودشان ساخته نمی‌شوند.

---

## 📊 وضعیت دقیق الان

| بخش | آماده؟ | کارِ مانده |
|---|:---:|---|
| کانفیگ لوکال (`.env` + پورت) | ✅ | — |
| جدول‌ها و دیتای **لوکال** | ❌ | `prisma db push` + `db:seed` |
| کانفیگ فایل‌های پروژه برای Vercel | ✅ | — |
| متغیرهای محیطی روی **Vercel** | ❌ | ست در داشبورد Vercel |
| جدول‌ها و دیتای **Supabase (آنلاین)** | ❌ | یک‌بار push + seed به Supabase |

---

## 🖥️ بخش ۱) لوکال را کامل کن

در پوشه‌ی پروژه:
```bash
npx prisma db push     # ساخت جدول‌ها روی دیتابیس barber لوکال
npm run db:seed        # ریختن داده‌ی نمونه (آرایشگرها/خدمات/…)
npm run dev            # اجرا → http://localhost:3000
```
✅ بعد از این، لوکال با داده بالا می‌آید — بدون VPN.

---

## ☁️ بخش ۲) Vercel + دیتابیس آنلاین (Supabase) را کامل کن

### قدم ۱ — جدول‌ها و داده را روی Supabase بساز (یک‌بار، بدون دست‌زدن به `.env`)
متغیرِ جلوی دستور، مقدار `.env` را **موقتاً** override می‌کند؛ پس `.env` لوکال دست‌نخورده می‌ماند:

```bash
# ساخت جدول‌ها روی Supabase
DATABASE_URL="postgresql://postgres.wjbnictowdjcqhivhkbl:Rj7JAMPHkyJZOWMG@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" \
DIRECT_URL="postgresql://postgres.wjbnictowdjcqhivhkbl:Rj7JAMPHkyJZOWMG@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" \
npx prisma db push
```

```bash
# (اختیاری) ریختن داده‌ی نمونه روی Supabase
DATABASE_URL="postgresql://postgres.wjbnictowdjcqhivhkbl:Rj7JAMPHkyJZOWMG@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" \
DIRECT_URL="postgresql://postgres.wjbnictowdjcqhivhkbl:Rj7JAMPHkyJZOWMG@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" \
npm run db:seed
```

### قدم ۲ — ۴ متغیر را در Vercel ست کن
مسیر: **Vercel → پروژه → Settings → Environment Variables** (برای هر سه محیط Production/Preview/Development تیک بزن):

| نام | مقدار |
|---|---|
| `DATABASE_URL` | `postgresql://postgres.wjbnictowdjcqhivhkbl:Rj7JAMPHkyJZOWMG@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | `postgresql://postgres.wjbnictowdjcqhivhkbl:Rj7JAMPHkyJZOWMG@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres` |
| `ADMIN_PASSWORD` | `admin` |
| `SESSION_SECRET` | `pkud3Lk34rxY5PItvpnzTIC5pg1dDBJYJMC8CT4p4AY=` |

### قدم ۳ — دیپلوی
```bash
git add -A && git commit -m "setup local + prod db" && git push
```
یا در Vercel دکمه‌ی **Redeploy** را بزن. بیلد خودش `prisma generate` (از `postinstall`) و `next build` را اجرا می‌کند.

---

## 🔐 گیت — چی می‌رود، چی نمی‌رود (خلاصه)

| فایل | در گیت؟ |
|---|:---:|
| `.env.example` | ✅ (بدون رمز) |
| `.env` | ❌ (رمزهای لوکال) |
| `*.db`, `node_modules/`, `.next/` | ❌ |

> رمز Supabase فقط در `.env` لوکال و در داشبورد Vercel است؛ **هیچ‌وقت به گیت نمی‌رود.**

---

## 📝 تصمیم‌ها (مزایا/معایب، شماره‌دار)

### ۱) push به Supabase با متغیر جلوی دستور (به‌جای ویرایش `.env`)
- **خوبی‌ها:** `.env` لوکال دست‌نخورده می‌ماند؛ خطای «یادم رفت برگردانم» صفر می‌شود.
- **بدی‌ها:** دستور طولانی است.
- **چرا این:** امن‌ترین راه؛ ریسک اجرای اشتباهی روی محیط اشتباه را حذف می‌کند.

### ۲) seed روی Supabase «اختیاری»
- **خوبی‌ها:** اگر می‌خواهی سایت آنلاین از ابتدا داده داشته باشد، بزنش.
- **بدی‌ها:** اگر بعداً از پنل ادمین داده وارد می‌کنی، seed تکراری می‌شود.
- **چرا اختیاری:** بستگی به این دارد که داده‌ی اولیه می‌خواهی یا خالی شروع می‌کنی.

### ۳) هر دو URL (pooled + direct) روی Vercel
- **خوبی‌ها:** `DATABASE_URL` پولد برای زمان اجرا (سریع، سازگار با Serverless)، `DIRECT_URL` برای migrate.
- **بدی‌ها:** باید دو مقدار ست شود نه یکی.
- **چرا این:** الگوی رسمی Supabase + Prisma؛ بدون `DIRECT_URL` مهاجرت‌ها روی Vercel می‌شکنند.

---

## 📌 جمع‌بندی: «الان درسته؟»
- **کانفیگ‌ها:** بله، آماده ✅
- **کار عملی مانده:** (۱) لوکال: `db push`+`seed`+`dev` — (۲) آنلاین: push+seed به Supabase، ست ۴ متغیر Vercel، redeploy.
- این‌ها را فقط خودت می‌توانی بزنی (Postgres و داشبورد Vercel روی دسترسی من نیستند). هر جا خطا خوردی، همان خطا را بفرست تا رفعش کنم.

</div>
