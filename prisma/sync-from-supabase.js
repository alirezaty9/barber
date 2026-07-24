// ─────────────────────────────────────────────────────────────
//  همگام‌سازی داده: از Supabase (پروداکشن) → دیتابیسِ لوکالِ تو
//
//  این نسخه «امن‌شده» است: مقصد (جایی که پاک و بازنویسی می‌شود) همیشه
//  دیتابیسِ لوکالِ .env توست؛ Supabase فقط «خوانده» می‌شود و هرگز تغییر نمی‌کند.
//  اگر به‌اشتباه مقصد یک آدرسِ Supabase/pooler باشد، اسکریپت متوقف می‌شود تا
//  هیچ‌وقت پروداکشن پاک نشود.
//
//  پیش‌نیاز: اول یک بار لوکال اسکیمای دیتابیس را ساخته باشی:
//     npx prisma db push
//
//  اجرا (آدرسِ direct-connection سوپابیس را بده — پورت 5432):
//     SUPABASE_URL="postgresql://postgres.xxxx:PASS@...pooler.supabase.com:5432/postgres" \
//       node prisma/sync-from-supabase.js
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// .env را دستی می‌خوانیم تا DATABASE_URLِ لوکال حتماً در دسترس باشد (مستقل از Prisma).
// خطوطِ کامنت‌شده (#...) نادیده گرفته می‌شوند، پس آدرسِ سوپابیسِ کامنت‌شده اینجا لود نمی‌شود.
try {
  const envText = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env نبود — اشکالی ندارد */ }

const SOURCE_URL = process.env.SUPABASE_URL || process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.DATABASE_URL; // مقصد = لوکالِ .env

if (!SOURCE_URL) {
  console.error('❌ SUPABASE_URL تعریف نشده. آدرسِ direct سوپابیس (پورت 5432) را بده. مثال:');
  console.error('   SUPABASE_URL="postgresql://postgres.xxxx:PASS@...pooler.supabase.com:5432/postgres" node prisma/sync-from-supabase.js');
  process.exit(1);
}
if (!TARGET_URL) {
  console.error('❌ DATABASE_URL (مقصدِ لوکال) در .env پیدا نشد.');
  process.exit(1);
}
// 🛡️ محافظِ ایمنی: مقصد نباید سوپابیس باشد (تا پروداکشن اشتباهی پاک نشود).
if (/supabase\.com|pooler\.supabase/i.test(TARGET_URL)) {
  console.error('🛑 مقصد (DATABASE_URL) به سوپابیس اشاره می‌کند! برای جلوگیری از پاک‌شدنِ پروداکشن، متوقف شدم.');
  console.error('   مطمئن شو در .env، DATABASE_URL روی دیتابیسِ لوکال (localhost) است.');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } }); // فقط‌خواندنی
const target = new PrismaClient({ datasources: { db: { url: TARGET_URL } } }); // لوکال

async function main() {
  console.log('📤 خواندن داده از Supabase (فقط خواندن، بدونِ تغییر) ...');
  const [barbers, services, blocks, bookings] = await Promise.all([
    source.barber.findMany(),
    source.service.findMany(),
    source.barberBlock.findMany(),
    source.booking.findMany(),
  ]);
  console.log(`   آرایشگر: ${barbers.length} | خدمت: ${services.length} | بلاک: ${blocks.length} | نوبت: ${bookings.length}`);

  if (!services.length && !bookings.length && !barbers.length) {
    console.log('ℹ️ دیتابیسِ سوپابیس خالی است (چیزی برای کپی نیست). احتمالاً پروداکشن هنوز seed نشده.');
    console.log('   به‌جایش می‌توانی از دیتای فیکِ لوکال استفاده کنی:  npm run db:seed');
    return;
  }

  console.log('🧹 پاک‌سازی دیتابیسِ لوکال (به ترتیب امنِ FK) ...');
  await target.booking.deleteMany();
  await target.barberBlock.deleteMany();
  await target.service.deleteMany();
  await target.barber.deleteMany();

  console.log('📥 نوشتن داده در دیتابیسِ لوکال ...');
  if (barbers.length) await target.barber.createMany({ data: barbers });
  if (services.length) await target.service.createMany({ data: services });
  if (blocks.length) await target.barberBlock.createMany({ data: blocks });
  if (bookings.length) await target.booking.createMany({ data: bookings });

  console.log('✅ تمام شد. حالا دیتابیسِ لوکالِ تو = کپیِ Supabase.');
}

main()
  .catch((e) => {
    console.error('❌ خطا در همگام‌سازی:', e);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
