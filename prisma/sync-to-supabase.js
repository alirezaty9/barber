// ─────────────────────────────────────────────────────────────
//  همگام‌سازی داده: از دیتابیسِ مبدأ (لوکال) → مقصد (Supabase)
//
//  این اسکریپت با یک PrismaClient به دو دیتابیس وصل می‌شود و همه‌ی
//  رکوردها را (به ترتیبِ امنِ کلیدهای خارجی) از مبدأ به مقصد کپی می‌کند.
//  ⚠️ مقصد اول پاک می‌شود، بعد داده‌ی مبدأ ریخته می‌شود (کپیِ کامل).
//
//  پیش‌نیاز: اسکیمای مقصد باید ساخته شده باشد → اول یک بار:
//     DATABASE_URL="<supabase-pooled>" DIRECT_URL="<supabase-direct>" npx prisma db push
//
//  اجرا (مبدأ = DATABASE_URL فعلیِ .env، مقصد را می‌دهی):
//     TARGET_DATABASE_URL="<supabase-direct-url>" node prisma/sync-to-supabase.js
//
//  یا هر دو را صریح بده:
//     SOURCE_DATABASE_URL="<local>" TARGET_DATABASE_URL="<supabase>" node prisma/sync-to-supabase.js
// ─────────────────────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');

const SOURCE_URL = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!TARGET_URL) {
  console.error('❌ TARGET_DATABASE_URL تعریف نشده. مقصد (Supabase) را بده. مثال:');
  console.error('   TARGET_DATABASE_URL="postgresql://postgres.xxx:PASS@...:5432/postgres" node prisma/sync-to-supabase.js');
  process.exit(1);
}
if (!SOURCE_URL) {
  console.error('❌ SOURCE_DATABASE_URL یا DATABASE_URL (مبدأ) تعریف نشده.');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } });
const target = new PrismaClient({ datasources: { db: { url: TARGET_URL } } });

async function main() {
  console.log('📤 خواندن داده از مبدأ ...');
  const [barbers, services, blocks, bookings] = await Promise.all([
    source.barber.findMany(),
    source.service.findMany(),
    source.barberBlock.findMany(),
    source.booking.findMany(),
  ]);
  console.log(`   آرایشگر: ${barbers.length} | خدمت: ${services.length} | بلاک: ${blocks.length} | نوبت: ${bookings.length}`);

  console.log('🧹 پاک‌سازی مقصد (به ترتیب امنِ FK) ...');
  await target.booking.deleteMany();
  await target.barberBlock.deleteMany();
  await target.service.deleteMany();
  await target.barber.deleteMany();

  console.log('📥 نوشتن در مقصد (Supabase) ...');
  if (barbers.length) await target.barber.createMany({ data: barbers });
  if (services.length) await target.service.createMany({ data: services });
  if (blocks.length) await target.barberBlock.createMany({ data: blocks });
  if (bookings.length) await target.booking.createMany({ data: bookings });

  console.log('✅ همگام‌سازی کامل شد. حالا Supabase = دیتابیسِ لوکالِ تو.');
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
