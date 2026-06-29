// اسکریپت seed — با `npm run db:seed` اجرا می‌شود (node prisma/seed.js).
// داده‌های اولیه‌ی پروژه (همان داده‌های نسخه‌ی قبلی) را در دیتابیس می‌ریزد.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BARBERS = [
  {
    id: 'b1',
    name: 'سهراب امینی',
    specialty: 'متخصص هیرکات مدرن و فید',
    avatar: '/images/barber-b1-avatar.jpg',
    rating: 4.9,
    bio: 'سهراب با بیش از ۸ سال تجربه در زمینه انواع هیرکات‌های مدرن و استایل‌های ژورنالی، تخصص ویژه‌ای در اجرای فید‌های دقیق و کارهای خلاقانه دارد.',
    image: '/images/barber-b1.jpg',
    workDays: '0,1,2,3,4,6',
  },
  {
    id: 'b2',
    name: 'آرش راد',
    specialty: 'استایلیست کلاسیک و گریم تخصصی',
    avatar: '/images/barber-b2-avatar.jpg',
    rating: 4.8,
    bio: 'آرش استاد اجرای مدل‌های کلاسیک، قیچی‌کاری‌های حرفه‌ای و گریم داماد است. ظرافت و حوصله در کار، امضای اوست.',
    image: '/images/barber-b2.jpg',
    workDays: '0,1,2,4,5',
  },
  {
    id: 'b3',
    name: 'کیان مهرزاد',
    specialty: 'طراح ریش و خط زن حرفه‌ای',
    avatar: '/images/barber-b3-avatar.jpg',
    rating: 4.95,
    bio: 'اگر به دنبال یک استایل ریش بی‌نقص و طراحی متناسب با آناتومی صورت خود هستید، کیان با اصلاح‌های گرم با حوله داغ بهترین انتخاب شماست.',
    image: '/images/barber-b3.jpg',
    workDays: '0,1,2,3,4,5',
  },
];

const SERVICES = [
  { id: 's1', name: 'اصلاح مو مدرن (هیرکات و فید)', price: 320000, duration: 45, description: 'شستشو با شامپوی حرفه‌ای، اصلاح مو متناسب با آناتومی چهره، سشوار و حالت‌دهی با محصولات پریمیوم.', category: 'hair' },
  { id: 's2', name: 'اصلاح و طراحی ریش مدرن', price: 180000, duration: 30, description: 'اصلاح کلاسیک با حوله داغ، استفاده از روغن ریش لوکس، طراحی دقیق خط ریش و فرم‌دهی متناسب با مو.', category: 'beard' },
  { id: 's3', name: 'پکیج رویال (هیرکات + ریش + گریم صورت)', price: 650000, duration: 90, description: 'کامل‌ترین خدمات شامل هیرکات مدرن، اصلاح ریش، پاکسازی و ماسک حبابی صورت، ماساژ سر و ریلکسیشن شانه.', category: 'combo' },
  { id: 's4', name: 'پاکسازی و آبرسانی پوست', price: 250000, duration: 45, description: 'لایه‌برداری عمیق پوست، از بین بردن جوش‌های سرسیاه، آبرسانی با بخور سرد و ماسک ورقه‌ای مغذی پوست.', category: 'grooming' },
  { id: 's5', name: 'اصلاح مو کلاسیک قیچی', price: 280000, duration: 40, description: 'اصلاح کامل سنتی فقط با قیچی و شانه بدون استفاده از ماشین، همراه با ماساژ و شستشو.', category: 'hair' },
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
    { code: 'BK1001', customerName: 'رضا علوی', customerPhone: '09121112233', serviceId: 's1', barberId: 'b1', date: today, timeSlot: '11:00', status: 'confirmed' },
    { code: 'BK1002', customerName: 'محمد احمدی', customerPhone: '09194445566', serviceId: 's2', barberId: 'b3', date: today, timeSlot: '14:00', status: 'confirmed' },
    { code: 'BK1003', customerName: 'سامان کریمی', customerPhone: '09107778899', serviceId: 's3', barberId: 'b2', date: tomorrow, timeSlot: '16:00', status: 'pending' },
    { code: 'BK1004', customerName: 'مهران شکیبا', customerPhone: '09351234567', serviceId: 's4', barberId: 'b1', date: tomorrow, timeSlot: '18:00', status: 'pending' },
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
