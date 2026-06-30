<div dir="rtl" align="right">

![تأیید](https://img.shields.io/badge/%D8%B1%D9%88%DB%8C_GitHub-sqlite_%D8%AA%D8%A3%DB%8C%DB%8C%D8%AF_%D8%B4%D8%AF-red?logo=github) ![کار](https://img.shields.io/badge/%DA%A9%D8%A7%D8%B1-%D8%B9%D9%88%D8%B6_%DA%A9%D8%B1%D8%AF%D9%86_%DB%B4_%D8%AE%D8%B7_%2B_push-brightgreen)

# ✅ دقیقاً همین بود! حالا درستش می‌کنیم

> دیدی؟ روی گیت‌هاب نوشته `provider = "sqlite"`. کافیست همین را `postgresql` کنیم و `directUrl` اضافه کنیم. فقط **بلوک datasource** (۴ خط) عوض می‌شود؛ بقیه‌ی فایل دست‌نخورده می‌ماند.

---

## 🎯 ساده‌ترین راه — این ۴ خط را عوض کن

در فایل `prisma/schema.prisma` روی لپ‌تاپت، این بخش را پیدا کن:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

و **جایگزینش کن** با این:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

ذخیره کن (`Ctrl+S`). تمام — بقیه‌ی فایل را دست نزن.

---

## 📋 یا اگر راحت‌تری: کل فایل را با این جایگزین کن

اگر می‌ترسی اشتباه کنی، **کل محتوای `prisma/schema.prisma`** را پاک کن و **عیناً این را Paste کن** (این همان فایل توست، فقط datasource درست شده):

```prisma
// پروداکشن: provider روی postgresql (Supabase). DATABASE_URL و DIRECT_URL در .env.
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Service {
  id          String    @id @default(cuid())
  name        String
  price       Int
  duration    Int // به دقیقه
  description String    @default("")
  category    String    @default("hair") // hair | beard | grooming | combo
  createdAt   DateTime  @default(now())
  bookings    Booking[]
}

model Barber {
  id        String    @id @default(cuid())
  name      String
  specialty String    @default("")
  avatar    String    @default("")
  rating    Float     @default(5)
  bio       String    @default("")
  image     String    @default("")
  // روزهای کاری به‌صورت CSV از 0..6 (0=شنبه ... 6=جمعه)
  workDays  String    @default("0,1,2,3,4,5,6")
  createdAt DateTime  @default(now())
  bookings  Booking[]
}

model Booking {
  id            String   @id @default(cuid())
  code          String   @unique // کد رهگیری برای مشتری
  customerName  String
  customerPhone String
  // در صورت حذف خدمت/آرایشگر، نوبت تاریخی حذف نشود؛ فقط مرجع null می‌شود.
  serviceId     String?
  service       Service? @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  barberId      String?
  barber        Barber?  @relation(fields: [barberId], references: [id], onDelete: SetNull)
  date          String // YYYY-MM-DD (میلادی؛ نمایش به کاربر جلالی است)
  timeSlot      String // HH:MM
  status        String   @default("pending") // pending | confirmed | cancelled
  createdAt     DateTime @default(now())

  @@index([barberId, date])
}

model Review {
  id           String   @id @default(cuid())
  customerName String
  rating       Float
  comment      String
  date         String
  createdAt    DateTime @default(now())
}
```

---

## 📤 بعد، commit و push کن

در ترمینال، داخل پوشه‌ی پروژه:

```bash
cd ~/Desktop/barber
git add prisma/schema.prisma
git commit -m "fix: use postgresql provider for production"
git push origin main
```

---

## ⏳ بعد از push چه می‌شود؟

۱. Vercel **خودش** یک دیپلوی جدید شروع می‌کند (لازم نیست کاری کنی).
۲. برو Vercel → تب **Deployments** → ببین دیپلوی تازه با وضعیت **Building** آمده.
۳. صبر کن تا **Ready** (سبز) شود (~۱-۲ دقیقه).
۴. آدرس **https://barber-kohl-two.vercel.app/** را باز کن.

> 🎉 این‌بار چون schema درست است، روی Vercel کلاینت Postgres ساخته می‌شود و سایت با آرایشگرها و خدمات بالا می‌آید.

برای تست نهایی: `https://barber-kohl-two.vercel.app/api/services` را هم باز کن — این‌بار باید **لیست خدمات** را ببینی، نه خطا.

---

## 💡 یک نکته (مهم نیست، فقط بدانی)

جدول‌هایی که با `setup.sql` ساختیم یک ستون اضافه‌ی بی‌استفاده (`serviceId2`) دارند که نسخه‌ی فعلیِ کدت از آن استفاده نمی‌کند. **این هیچ مشکلی ایجاد نمی‌کند** (ستون خالی نادیده گرفته می‌شود). پس نگرانش نباش؛ همه‌چیز کار می‌کند.

---

## 🗺️ کجاییم؟

```
[✅] جدول‌ها در Supabase  [✅] متغیرها در Vercel  [✅] علت پیدا شد (sqlite)
[👉 الان] عوض‌کردن provider → postgresql + push  ← آخرین قدم!
[  بعد] دیپلوی خودکار → سایت سالم 🎉
```

---

## 📝 تصمیم‌ها (مزایا/معایب)

### تصمیم ۱) دادن کل فایل آماده برای Paste
- **خوبی‌ها:** برای کاربر مبتدی بدون خطا؛ فقط کپی-پیست.
- **بدی‌ها:** اگر فایلت تغییر دیگری داشته، با این جایگزین می‌شود (ولی این همان فایل توست).
- **چرا:** ساده‌ترین و مطمئن‌ترین راه برای جلوگیری از اشتباه تایپی.

### تصمیم ۲) دست‌نزدن به مدل‌ها (فقط datasource)
- **خوبی‌ها:** هماهنگ با کد فعلیِ تو روی گیت‌هاب؛ ریسک صفر.
- **بدی‌ها:** ندارد.
- **چرا:** تنها چیزی که خطا می‌داد `provider` بود، نه مدل‌ها.

---

> 🎯 **الان:** datasource را به `postgresql` عوض کن (+`directUrl`)، ذخیره، و سه دستور git را بزن. بعد از Ready شدن دیپلوی، سایت را باز کن و بگو نتیجه چه شد. تقریباً تمام است! 🚀

</div>
