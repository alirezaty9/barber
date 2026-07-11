// ─────────────────────────────────────────────────────────────
//  تستِ اتصال به دیتابیس — فقط چک می‌کند رمز/رشتهٔ اتصال درست است یا نه.
//  کاری روی داده نمی‌کند؛ فقط یک «SELECT 1» می‌زند و نتیجه را می‌گوید.
//
//  اجرا (رشتهٔ کامل با رمزی که می‌خواهی تست کنی):
//    TEST_DATABASE_URL="postgresql://postgres.xxx:رمزت@...:5432/postgres" node prisma/test-connection.js
// ─────────────────────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');

const url = process.env.TEST_DATABASE_URL;

if (!url) {
  console.error('❌ باید TEST_DATABASE_URL را بدهی. مثال:');
  console.error('   TEST_DATABASE_URL="postgresql://postgres.xxx:PASS@host:5432/postgres" node prisma/test-connection.js');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

async function main() {
  console.log('⏳ در حال تلاش برای اتصال ...');
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ رمز درست است و اتصال موفق بود. همین رشته را می‌توانی همه‌جا استفاده کنی.');
}

main()
  .catch((e) => {
    const msg = String(e && e.message || e);
    if (/authentication failed|password/i.test(msg)) {
      console.error('❌ رمز اشتباه است (authentication failed). این رمز درست نیست.');
    } else if (/reach|ENOTFOUND|timeout|ECONNREFUSED/i.test(msg)) {
      console.error('❌ به سرور نرسید (هاست/پورت یا اینترنت). رمز را نمی‌شود قضاوت کرد؛ اول اتصال را درست کن.');
    } else {
      console.error('❌ خطا:', msg.split('\n')[0]);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
