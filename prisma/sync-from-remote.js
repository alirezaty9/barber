// ─────────────────────────────────────────────────────────────
//  همگام‌سازی داده: از دیتابیسِ هاست (پروداکشن) → دیتابیسِ لوکالِ تو
//
//  کاربرد: می‌خواهی داده‌ی واقعیِ سایت را روی کامپیوترِ خودت داشته باشی تا یک باگ را
//  با دادهٔ واقعی بررسی کنی، بدونِ اینکه به دیتابیسِ زنده دست بزنی.
//
//  این نسخه «امن‌شده» است: مقصد (جایی که پاک و بازنویسی می‌شود) همیشه دیتابیسِ
//  لوکالِ .env توست؛ دیتابیسِ هاست فقط «خوانده» می‌شود و هرگز تغییر نمی‌کند.
//  اگر مقصد به هر چیزی جز localhost اشاره کند، اسکریپت متوقف می‌شود.
//
//  پیش‌نیاز: اول یک بار لوکال اسکیمای دیتابیس را ساخته باشی:
//     npx prisma db push
//
//  اجرا (آدرسِ دیتابیسِ هاست را بده):
//     SOURCE_DATABASE_URL="postgresql://USER:PASS@HOST:PORT/DBNAME" \
//       node prisma/sync-from-remote.js
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// .env را دستی می‌خوانیم تا DATABASE_URLِ لوکال حتماً در دسترس باشد (مستقل از Prisma).
// خطوطِ کامنت‌شده (#...) نادیده گرفته می‌شوند، پس آدرسِ پروداکشنی که در .env کامنت شده اینجا لود نمی‌شود.
try {
  const envText = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env نبود — اشکالی ندارد */ }

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.DATABASE_URL; // مقصد = لوکالِ .env

if (!SOURCE_URL) {
  console.error('❌ SOURCE_DATABASE_URL تعریف نشده. آدرسِ دیتابیسِ هاست (مبدأ) را بده. مثال:');
  console.error('   SOURCE_DATABASE_URL="postgresql://USER:PASS@HOST:PORT/DBNAME" node prisma/sync-from-remote.js');
  process.exit(1);
}
if (!TARGET_URL) {
  console.error('❌ DATABASE_URL (مقصدِ لوکال) در .env پیدا نشد.');
  process.exit(1);
}
// 🛡️ محافظِ ایمنی: مقصد باید حتماً دیتابیسِ روی همین کامپیوتر باشد.
//
// چرا این‌طور نوشته شده؟ نسخه‌ی قبلی فقط آدرس‌های یک سرویسِ خاص را رد می‌کرد — یعنی
// یک فهرستِ سیاه. با عوض‌شدنِ هاست، آن فهرست کهنه می‌شد و محافظ بی‌صدا بی‌اثر می‌شد.
// حالا برعکس شده: هر چیزی جز localhost رد می‌شود (فهرستِ سفید). این‌طور محافظ با
// هیچ تغییرِ هاستی کهنه نمی‌شود، چون تعریفِ «لوکال» هرگز عوض نمی‌شود.
if (!/@(localhost|127\.0\.0\.1|\[::1\])[:/]/i.test(TARGET_URL)) {
  console.error('🛑 مقصد (DATABASE_URL) به یک دیتابیسِ غیرلوکال اشاره می‌کند!');
  console.error('   این اسکریپت مقصد را کاملاً پاک می‌کند، پس برای جلوگیری از پاک‌شدنِ');
  console.error('   دیتابیسِ واقعیِ هاست، متوقف شدم.');
  console.error('   مطمئن شو در .env، DATABASE_URL روی localhost است.');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } }); // فقط‌خواندنی
const target = new PrismaClient({ datasources: { db: { url: TARGET_URL } } }); // لوکال

async function main() {
  console.log('📤 خواندن داده از دیتابیسِ هاست (فقط خواندن، بدونِ تغییر) ...');
  const [barbers, services, blocks, bookings] = await Promise.all([
    source.barber.findMany(),
    source.service.findMany(),
    source.barberBlock.findMany(),
    source.booking.findMany(),
  ]);
  console.log(`   آرایشگر: ${barbers.length} | خدمت: ${services.length} | بلاک: ${blocks.length} | نوبت: ${bookings.length}`);

  if (!services.length && !bookings.length && !barbers.length) {
    console.log('ℹ️ دیتابیسِ مبدأ خالی است (چیزی برای کپی نیست). احتمالاً پروداکشن هنوز seed نشده.');
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

  console.log('✅ تمام شد. حالا دیتابیسِ لوکالِ تو = کپیِ دیتابیسِ هاست.');
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
