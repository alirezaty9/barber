import { prisma } from '@/lib/db';
import { serializeBarbers } from '@/lib/serializers';
import Navbar from '@/features/landing/Navbar';
import LandingHero from '@/features/landing/LandingHero';
import ServicesSection from '@/features/landing/ServicesSection';
import Footer from '@/features/landing/Footer';
import BookingLauncher from '@/features/booking/BookingLauncher';
import PwaInstallPrompt from '@/features/pwa/PwaInstallPrompt';

// این صفحه در هر درخواست روی سرور ساخته می‌شود و کاتالوگ را زنده از دیتابیس می‌خواند.
//
// 🔴 چرا کش نمی‌کنیم؟ قبلاً این صفحه ISR بود (هر ۵ دقیقه یک‌بار ساخته می‌شد). ولی سرورِ
// بیلد هیچ‌وقت داخلِ شبکه‌ی خصوصیِ دیتابیس نیست، پس نسخه‌ی اولیه‌ای که موقعِ بیلد پخته
// می‌شد همیشه کاتالوگِ خالی داشت — و همان خالی تا اولین revalidate به همه‌ی بازدیدکننده‌ها
// سرو می‌شد. یعنی بعد از *هر* استقرار، تا ۵ دقیقه صفحه‌ی اصلی بدونِ خدمات بود.
//
// هزینه‌ی این تصمیم: هر بازدید دو کوئریِ کوچکِ ایندکس‌شده می‌زند. چون دیتابیس در همان
// شبکه‌ی خصوصیِ سرور است و تعدادِ خدمات/آرایشگرها انگشت‌شمار است، این چند میلی‌ثانیه است.
// اگر روزی ترافیک واقعاً بالا رفت، راهِ درست کش‌کردنِ *داده* (نه صفحه) با unstable_cache
// و باطل‌کردنش با revalidateTag هنگامِ تغییرِ ادمین است — نه برگشتن به ISR.
export const dynamic = 'force-dynamic';

export default async function Home() {
  // اگر دیتابیس لحظه‌ای در دسترس نباشد، به‌جای ۵۰۰ و صفحه‌ی سفید، صفحه با کاتالوگِ خالی
  // رندر می‌شود. بقیه‌ی صفحه (تماس، آدرس، ساعتِ کاری) همچنان به مشتری نشان داده می‌شود.
  let services = [];
  let barbers = [];
  try {
    const [svc, barbersRaw] = await Promise.all([
      prisma.service.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.barber.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    services = svc;
    barbers = serializeBarbers(barbersRaw);
  } catch {
    // خطا عمداً بلعیده می‌شود؛ صفحه با داده‌ی خالی سرو می‌شود.
  }

  return (
    <div className="bg-[#030303] min-h-screen text-zinc-100 font-sans selection:bg-amber-500/30 selection:text-amber-300">
      <Navbar />
      <LandingHero />
      <ServicesSection services={services} />
      <Footer />

      {/* مودال رزرو — با Zustand کنترل می‌شود و داده‌ها را خودش از API می‌گیرد */}
      <BookingLauncher services={services} barbers={barbers} />

      {/* پاپ‌آپِ نصبِ اپ (PWA) — چسبیده به پایینِ صفحه، مخصوصِ موبایل */}
      <PwaInstallPrompt />
    </div>
  );
}
