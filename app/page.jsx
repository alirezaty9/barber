import { prisma } from '@/lib/db';
import { serializeBarbers } from '@/lib/serializers';
import Navbar from '@/features/landing/Navbar';
import LandingHero from '@/features/landing/LandingHero';
import ServicesSection from '@/features/landing/ServicesSection';
import BarbersSection from '@/features/landing/BarbersSection';
import ReviewsSection from '@/features/landing/ReviewsSection';
import Footer from '@/features/landing/Footer';
import BookingLauncher from '@/features/booking/BookingLauncher';

// همیشه داده‌ی به‌روز از دیتابیس (کاتالوگ توسط ادمین تغییر می‌کند).
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [services, barbersRaw, reviews] = await Promise.all([
    prisma.service.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.barber.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.review.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);
  const barbers = serializeBarbers(barbersRaw);

  return (
    <div className="bg-[#030303] min-h-screen text-zinc-100 font-sans selection:bg-amber-500/30 selection:text-amber-300">
      <Navbar />
      <LandingHero />
      <ServicesSection services={services} />
      <BarbersSection barbers={barbers} />
      <ReviewsSection reviews={reviews} />
      <Footer />

      {/* مودال رزرو — با Zustand کنترل می‌شود و داده‌ها را خودش از API می‌گیرد */}
      <BookingLauncher services={services} barbers={barbers} />
    </div>
  );
}
