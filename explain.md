<div dir="rtl" align="right">

![کد](https://img.shields.io/badge/%DA%A9%D8%AF_%D9%86%D9%88%D8%B4%D8%AA%D9%87_%D8%B4%D8%AF%D8%9F-%D8%A8%D9%84%D9%87_%E2%80%94_%DB%B1%DB%B5_%D9%81%D8%A7%DB%8C%D9%84-brightgreen)

# 🔬 توضیح ریز فنیِ تغییرات بهینه‌سازی

---

## 🧩 A2 — کشینگ ISR + ابطال

### `app/page.jsx`
```diff
- export const dynamic = 'force-dynamic';
+ export const revalidate = 300;
```
- `force-dynamic` یعنی «هر درخواست = رندر تازه + کوئری دیتابیس». با دیتابیسِ دور، هر بازدید کند بود.
- `revalidate = 300` یعنی Next یک‌بار HTML را می‌سازد و **۵ دقیقه** همان نسخه‌ی کش‌شده را به همه می‌دهد (بدون زدن به دیتابیس)؛ بعد از ۵ دقیقه در پس‌زمینه تازه می‌کند (ISR).

### روت‌های ادمین (services/barbers/reviews)
```js
import { revalidatePath } from 'next/cache';
// ... بعد از create/update/delete موفق:
revalidatePath('/');
```
- مشکل کش: اگر ادمین خدمتی اضافه کند، باید تا ۵ دقیقه صبر کند؟ نه.
- `revalidatePath('/')` بلافاصله کش صفحه‌ی اصلی را باطل می‌کند → تغییر **فوری** دیده می‌شود.
- **بهترین هر دو دنیا:** سرعت کش + تازگی هنگام نیاز.

---

## 🧩 A1 — `vercel.json`
```json
{ "regions": ["fra1"] }
```
- پیش‌فرض Vercel فانکشن‌ها را در آمریکا (`iad1`) اجرا می‌کرد؛ دیتابیس در توکیو بود → هر کوئری یک سفر بین‌قاره‌ای.
- `fra1` = فرانکفورت. با انتقال دیتابیس به فرانکفورت، **فانکشن و دیتابیس کنار هم** می‌شوند (round-trip ~۱ms به‌جای ~۲۵۰ms) و هر دو نزدیک ایران.

---

## 🧩 A3 — `next/image`

### `LandingHero.jsx`
```diff
- <div style={{ backgroundImage: `url('/images/hero-bg.jpg')`, ... }} />
+ <Image src="/images/hero-bg.jpg" alt="" fill priority sizes="100vw"
+   className="object-cover opacity-20 mix-blend-luminosity z-0" />
```
- background-image در CSS هیچ بهینه‌سازی‌ای ندارد → فایل خام ۵۳۲KB دانلود می‌شد.
- `next/image` روی Vercel خودکار: فرمت مدرن (WebP/AVIF)، ری‌سایز بر اساس صفحه، و کش CDN.
- `fill` = پر کردن والدِ نسبی؛ `priority` = چون LCP و بالای صفحه است؛ `object-cover` معادل `background-size: cover`.

### `ServicesSection.jsx`
```diff
- <img src={src} loading="lazy" onError={...}
-   className="absolute inset-0 w-full h-full object-cover ..." />
+ <Image src={src} fill sizes="(max-width: 768px) 100vw, 50vw" onError={...}
+   className="object-cover ..." />
```
- `sizes` به مرورگر می‌گوید در دسکتاپ هر کارت نصف عرض است → نسخه‌ی کوچک‌تر دانلود می‌شود.
- فال‌بکِ `onError` (آیکن قیچی) دست‌نخورده ماند.

---

## 🧩 A4 — لِیزی‌لود تقویم

ساختار دو فایلی شد:
- `JalaliDatePickerImpl.jsx` = پیاده‌سازی واقعی (import کتابخانه‌ی سنگین).
- `JalaliDatePicker.jsx` = wrapper:
```js
const JalaliDatePicker = dynamic(() => import('./JalaliDatePickerImpl'), {
  ssr: false,
  loading: () => <div className="... animate-pulse" />,
});
```
- `dynamic(...)` کد را به یک chunk جدا می‌برد که فقط هنگام رندر تقویم دانلود می‌شود → باندل اولیه‌ی مودال/فرم سبک‌تر.
- `ssr:false` چون `react-multi-date-picker` فقط سمت کلاینت کار می‌کند.
- چون هر دو مصرف‌کننده (`BookingWizard`, `ManualBooking`) همان نام `JalaliDatePicker` را import می‌کنند، **بدون تغییر در آن‌ها** بهره بردند.

---

## 🧩 B2 — رفع کلیپ تقویم در مودال
در `JalaliDatePickerImpl.jsx` پراپ `portal` اضافه شد:
- بدون `portal`، تقویم داخل `Dialog.Content` با `max-h-[90vh] overflow-y-auto` رندر می‌شد و پایینش **بریده** می‌شد.
- با `portal`، تقویم در سطح `body` رندر می‌شود و از overflowِ مودال آزاد است.

---

## 🧩 B3 — فال‌بک فونت (`globals.css`)
```diff
- --font-sans: var(--font-vazir), "Inter", system-ui, ...;
+ --font-sans: var(--font-vazir), system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif;
```
- قبلاً قبل از لود وزیر، فونت لاتین `Inter` اول می‌آمد (که گلیف فارسی ندارد) → فلش زشت.
- حالا `system-ui` (که فارسی دارد) جای آن است.
- _چرا `--font-display` را به `@theme` اضافه نکردم؟_ چون خودش متغیرِ next/font است؛ تعریف `--font-display: var(--font-display)` **خود-ارجاع** و خراب می‌شد. کلاس `.font-display` از قبل درست کار می‌کند.

---

## 🧩 B4 — کلاس داینامیک ادمین
```diff
- <Icon className={`w-4 h-4 ${iconClass}`} />
+ <Icon className={cn('w-4 h-4', iconClass)} />
```
- درستش این بود (هرچند مقادیر `iconClass` استاتیک بودند و خطر purge کم بود). `cn` (twMerge+clsx) امن‌تر و تمیزتر است.

---

## 🧩 C1/C2 — تمیزکاری
- حذف `'use client'` از `ReviewsSection.jsx` و `Field.jsx`: این‌ها هیچ هوک/state/event ندارند → Server Component می‌شوند و از باندل کلاینت خارج. (داخل کامپوننت‌های کلاینت هم قابل‌استفاده‌اند چون «بدون directive» = مشترک.)
- حذف `@supabase/*` از `package.json`: هیچ‌جای کد import نشده بودند. ⚠️ باید `npm install` بزنی تا `package-lock.json` هم هماهنگ شود وگرنه `npm ci` در Vercel می‌شکند.

---

## 📝 تصمیم‌ها و مزایا/معایب (شماره‌دار)

۱) **ISR + revalidatePath** — خوبی: سریع‌ترین جهش سرعت. بدی: پیچیدگی ابطال (حل شد). 
۲) **next/image** — خوبی: بهینه‌ی خودکار بدون ابزار. بدی: پردازش ناچیز سمت سرور. 
۳) **wrapper لِیزی‌لود** — خوبی: DRY، هر دو مصرف‌کننده سبک. بدی: یک فایل اضافه. 
۴) **portal تقویم** — خوبی: رفع کلیپ مودال. بدی: ندارد. 
۵) **حذف use client / supabase** — خوبی: باندل و وابستگی کمتر. بدی: نیاز به `npm install` برای lock. 
۶) **موکول‌کردن بازسازی بزرگ به فاز ۲** — خوبی: کم‌ریسک ماندن این فاز. بدی: تکرارها فعلاً می‌مانند. چرا: انتخاب صریح کاربر (مسیر سریع/کم‌ریسک).

</div>
