// اسکریپت seed — با `npm run db:seed` اجرا می‌شود (node prisma/seed.js).
// داده‌های اولیه‌ی پروژه (همان داده‌های نسخه‌ی قبلی) را در دیتابیس می‌ریزد.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// تنها آرایشگرِ مجموعه (پروژه تک‌آرایشگره است؛ مشتری آرایشگر انتخاب نمی‌کند).
// 🧹 پاک‌سازیِ ۱۴۰۵/۰۶/۲۸: فیلدهای تخصص/آواتار/عکس/امتیاز/بیوگرافی برداشته شدند —
// هیچ صفحه‌ای نمایششان نمی‌داد و بازمانده‌ی نسخه‌ی چندآرایشگره بودند.
// (ستون‌هایشان در دیتابیس مقدارِ پیش‌فرض می‌گیرند، پس این رکورد کاملاً معتبر است.)
const BARBERS = [
  {
    id: 'b1',
    name: 'استاد بند',
    workDays: '0,1,2,3,4,5,6',
  },
];

// دو خدمتِ اصلی (هر نوبت ثابت ۱ ساعت و ربع = ۷۵ دقیقه).
const SERVICES = [
  { id: 's1', name: 'هیرکات با استایل', price: 1000000, duration: 75, description: 'شستشو با شامپوی حرفه‌ای، اصلاح مو متناسب با آناتومی چهره، سشوار و استایل‌دهیِ تخصصی با محصولات پریمیوم.', category: 'hair' },
  { id: 's2', name: 'ریش', price: 500000, duration: 75, description: 'اصلاح و طراحی ریش با حوله داغ، روغن ریش لوکس، طراحی دقیق خط ریش و فرم‌دهی متناسب با مو.', category: 'beard' },
];

// تاریخِ محلی (نه UTC) تا با «امروزِ» صفحه‌ی برنامه‌ی روزانه هماهنگ باشد.
function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 🔴 محافظ: این اسکریپت اول همه‌ی نوبت‌ها، خدمات و آرایشگرها را **پاک می‌کند** و بعد
// داده‌ی نمونه می‌ریزد. روی دیتابیسِ واقعی یعنی ازدست‌رفتنِ کاملِ رزروهای مشتری‌ها، به‌علاوه‌ی
// چند میلیون تومان درآمدِ جعلی در داشبورد. فقط روی دیتابیسِ لوکال اجرا می‌شود، مگر با
// پرچمِ صریحِ ALLOW_SEED_REMOTE=yes.
function assertSafeTarget() {
  if (process.env.ALLOW_SEED_REMOTE === 'yes') return;
  const url = process.env.DATABASE_URL || '';
  let host = '';
  try { host = new URL(url).hostname; } catch { /* آدرسِ نامعتبر */ }
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (process.env.NODE_ENV === 'production' || !isLocal) {
    console.error('❌ داده‌ی نمونه فقط روی دیتابیسِ لوکال ریخته می‌شود.');
    console.error(`   مقصدِ فعلی: ${host || '(نامشخص)'} — این دستور همه‌ی نوبت‌های موجود را پاک می‌کند.`);
    console.error('   اگر واقعاً همین را می‌خواهی: ALLOW_SEED_REMOTE=yes npm run db:seed');
    process.exit(1);
  }
}

async function main() {
  assertSafeTarget();
  // پاک‌سازی برای اجرای تکراریِ بی‌خطر
  await prisma.booking.deleteMany();
  await prisma.service.deleteMany();
  await prisma.barber.deleteMany();

  for (const b of BARBERS) await prisma.barber.create({ data: b });
  for (const s of SERVICES) await prisma.service.create({ data: s });

  const today = dateStr(0);
  const tomorrow = dateStr(1);
  const dayAfter = dateStr(2);

  // دیتای فیکِ متنوع روی ساعت‌های جدید (۱ ساعت و ربع): امروز چند نوبت پر است تا
  // صفحه‌ی «برنامه‌ی روزانه» و «مدیریت نوبت‌ها» پر و قابلِ بررسی باشند.
  const bookings = [
    // ── امروز ──
    { code: 'BK1001', customerName: 'رضا علوی',    customerPhone: '09121112233', serviceId: 's1', servicesLabel: 'هیرکات با استایل', barberId: 'b1', date: today,    timeSlot: '09:00', status: 'confirmed', amount: 1000000, paymentStatus: 'paid',   paymentRefId: '100001' },
    { code: 'BK1002', customerName: 'محمد احمدی',  customerPhone: '09194445566', serviceId: 's2', servicesLabel: 'ریش',              barberId: 'b1', date: today,    timeSlot: '10:15', status: 'confirmed', amount: 500000,  paymentStatus: 'paid',   paymentRefId: '100002' },
    { code: 'BK1003', customerName: 'سامان کریمی', customerPhone: '09107778899', serviceId: 's1', servicesLabel: 'هیرکات با استایل', barberId: 'b1', date: today,    timeSlot: '12:45', status: 'confirmed', amount: 1000000, paymentStatus: 'paid',   paymentRefId: '100003' },
    { code: 'BK1004', customerName: 'کاوه رستمی',  customerPhone: '09901234567', serviceId: 's2', servicesLabel: 'ریش',              barberId: 'b1', date: today,    timeSlot: '15:15', status: 'confirmed', amount: 500000,  paymentStatus: 'paid',   paymentRefId: '100004' },
    // ── فردا ──
    { code: 'BK1005', customerName: 'مهران شکیبا', customerPhone: '09351234567', serviceId: 's1', servicesLabel: 'هیرکات با استایل', barberId: 'b1', date: tomorrow, timeSlot: '10:15', status: 'confirmed', amount: 1000000, paymentStatus: 'paid',   paymentRefId: '100005' },
    { code: 'BK1006', customerName: 'آرش نادری',   customerPhone: '09037654321', serviceId: 's2', servicesLabel: 'ریش',              barberId: 'b1', date: tomorrow, timeSlot: '15:15', status: 'confirmed', amount: 500000,  paymentStatus: 'paid',   paymentRefId: '100006' },
    // ── پس‌فردا (یکی لغوشده برای تنوع) ──
    // ⚠️ وضعیتِ «مسترد شده» عمداً حذف شد: با کلیدِ فعلیِ استرداد (خاموش) اپ چنین رکوردی
    // تولید نمی‌کند، پس دمو قابلیتی را نشان می‌داد که در سیستمِ واقعی وجود ندارد.
    { code: 'BK1007', customerName: 'بهزاد مرادی', customerPhone: '09121239876', serviceId: 's1', servicesLabel: 'هیرکات با استایل', barberId: 'b1', date: dayAfter, timeSlot: '11:30', status: 'cancelled', amount: 1000000, paymentStatus: 'paid', cancelledBy: 'customer' },
  ];
  for (const bk of bookings) await prisma.booking.create({ data: bk });

  console.log('Seed complete:', { barbers: BARBERS.length, services: SERVICES.length, bookings: bookings.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
