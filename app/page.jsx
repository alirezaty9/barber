import { prisma } from '@/lib/db';
import { serializeBarbers } from '@/lib/serializers';
import Navbar from '@/features/landing/Navbar';
import LandingHero from '@/features/landing/LandingHero';
import ServicesSection from '@/features/landing/ServicesSection';
import Footer from '@/features/landing/Footer';
import BookingLauncher from '@/features/booking/BookingLauncher';
import PwaInstallPrompt from '@/features/pwa/PwaInstallPrompt';

// کاتالوگ به‌ندرت تغییر می‌کند: صفحه را کش می‌کنیم (ISR) و هر ۵ دقیقه یک‌بار
// (یا بلافاصله پس از تغییر ادمین، با revalidatePath('/')) از نو می‌سازیم.
// نتیجه: بیشتر بازدیدها بدون زدن به دیتابیس و خیلی سریع سرو می‌شوند.
export const revalidate = 300;

export default async function Home() {
  // اگر دیتابیس هنگامِ build یا revalidate در دسترس نباشد، به‌جای کرش‌کردنِ کلِ صفحه
  // (که می‌تواند کلِ دیپلوی را بشکند) با کاتالوگِ خالی رندر می‌کنیم؛ در revalidateِ
  // بعدی دوباره پر می‌شود. تجربه‌ی افت‌کرده بهتر از ۵۰۰/شکستِ بیلد است.
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
