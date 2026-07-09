// اسکریپت seed — با `npm run db:seed` اجرا می‌شود (node prisma/seed.js).
// داده‌های اولیه‌ی پروژه (همان داده‌های نسخه‌ی قبلی) را در دیتابیس می‌ریزد.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// تنها آرایشگرِ مجموعه (پروژه تک‌آرایشگره است؛ مشتری آرایشگر انتخاب نمی‌کند).
const BARBERS = [
  {
    id: 'b1',
    name: 'استاد بند',
    specialty: 'هیرکات، ریش و استایل تخصصی',
    avatar: '/images/barber-b1-avatar.jpg',
    rating: 4.9,
    bio: 'با بیش از ۸ سال تجربه در انواع هیرکات‌های مدرن، طراحی ریش و استایل‌های ژورنالی؛ تمرکز بر ظرافت، دقت و رضایت کامل مشتری.',
    image: '/images/barber-b1.jpg',
    workDays: '0,1,2,3,4,5,6',
  },
];

const SERVICES = [
  { id: 's1', name: 'هیرکات', price: 1000000, duration: 45, description: 'شستشو با شامپوی حرفه‌ای، اصلاح مو متناسب با آناتومی چهره، سشوار و حالت‌دهی با محصولات پریمیوم.', category: 'hair' },
  { id: 's2', name: 'ریش', price: 500000, duration: 30, description: 'اصلاح و طراحی ریش با حوله داغ، استفاده از روغن ریش لوکس، طراحی دقیق خط ریش و فرم‌دهی متناسب با مو.', category: 'beard' },
  { id: 's3', name: 'استایل', price: 500000, duration: 60, description: 'حالت‌دهی و استایل تخصصی مو با جدیدترین متدها و محصولات روز دنیا، متناسب با فرم چهره و سلیقه شما.', category: 'style' },
];

const REVIEWS = [
  { customerName: 'علیرضا عبادی', rating: 5, comment: 'دکور فوق‌العاده شیک، برخورد پرسنل عالی و کیفیت هیرکات سهراب بی‌نظیر بود. حتما باز هم میام.', date: '۱۴۰۵/۰۴/۰۵' },
  { customerName: 'پوریا رضایی', rating: 4.8, comment: 'طراحی ریش کیان فوق‌العاده با وسواس و تمیز بود. استفاده از حوله داغ و ماساژ حس خوبی داشت.', date: '۱۴۰۵/۰۴/۰۳' },
  { customerName: 'امین حسینی', rating: 5, comment: 'پکیج رویال رو رزرو کردم و واقعاً فراتر از انتظارم بود. پوست کل صورتم شاداب شد و اصلاح مو هم درجه یک بود.', date: '۱۴۰۵/۰۴/۰۱' },
];

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

async function main() {
  // پاک‌سازی برای اجرای تکراریِ بی‌خطر
  await prisma.booking.deleteMany();
  await prisma.review.deleteMany();
  await prisma.service.deleteMany();
  await prisma.barber.deleteMany();

  for (const b of BARBERS) await prisma.barber.create({ data: b });
  for (const s of SERVICES) await prisma.service.create({ data: s });
  for (const r of REVIEWS) await prisma.review.create({ data: r });

  const today = dateStr(0);
  const tomorrow = dateStr(1);

  const bookings = [
    { code: 'BK1001', customerName: 'رضا علوی', customerPhone: '09121112233', serviceId: 's1', barberId: 'b1', date: today, timeSlot: '11:00', status: 'confirmed', amount: 1000000, paymentStatus: 'paid', paymentRefId: '100001' },
    { code: 'BK1002', customerName: 'محمد احمدی', customerPhone: '09194445566', serviceId: 's2', barberId: 'b1', date: today, timeSlot: '14:00', status: 'confirmed', amount: 500000, paymentStatus: 'paid', paymentRefId: '100002' },
    { code: 'BK1003', customerName: 'سامان کریمی', customerPhone: '09107778899', serviceId: 's3', barberId: 'b1', date: tomorrow, timeSlot: '16:00', status: 'pending', amount: 500000, paymentStatus: 'paid', paymentRefId: '100003' },
    { code: 'BK1004', customerName: 'مهران شکیبا', customerPhone: '09351234567', serviceId: 's1', barberId: 'b1', date: tomorrow, timeSlot: '18:00', status: 'pending', amount: 1000000, paymentStatus: 'paid', paymentRefId: '100004' },
  ];
  for (const bk of bookings) await prisma.booking.create({ data: bk });

  console.log('Seed complete:', { barbers: BARBERS.length, services: SERVICES.length, reviews: REVIEWS.length, bookings: bookings.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
