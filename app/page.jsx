import { prisma } from '@/lib/db';
import { serializeBarbers } from '@/lib/serializers';
import Navbar from '@/features/landing/Navbar';
import LandingHero from '@/features/landing/LandingHero';
import ServicesSection from '@/features/landing/ServicesSection';
import Footer from '@/features/landing/Footer';
import BookingLauncher from '@/features/booking/BookingLauncher';

// کاتالوگ به‌ندرت تغییر می‌کند: صفحه را کش می‌کنیم (ISR) و هر ۵ دقیقه یک‌بار
// (یا بلافاصله پس از تغییر ادمین، با revalidatePath('/')) از نو می‌سازیم.
// نتیجه: بیشتر بازدیدها بدون زدن به دیتابیس و خیلی سریع سرو می‌شوند.
export const revalidate = 300;

export default async function Home() {
  const [services, barbersRaw] = await Promise.all([
    prisma.service.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.barber.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);
  const barbers = serializeBarbers(barbersRaw);

  return (
    <div className="bg-[#030303] min-h-screen text-zinc-100 font-sans selection:bg-amber-500/30 selection:text-amber-300">
      <Navbar />
      <LandingHero />
      <ServicesSection services={services} />
      <Footer />

      {/* مودال رزرو — با Zustand کنترل می‌شود و داده‌ها را خودش از API می‌گیرد */}
      <BookingLauncher services={services} barbers={barbers} />
    </div>
  );
}
