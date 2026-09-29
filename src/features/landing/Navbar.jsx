'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scissors, Calendar, Menu, X, Search } from 'lucide-react';
import { useBookingStore } from '@/features/booking/store';
import BrandWordmark from './BrandWordmark';

// ثابت و مستقل از رندر — لازم نیست در هر رندر بازساخته شود.
//
// دو نوع لینک اینجا هست و تفاوتشان مهم است:
//   • route: false → لنگرِ داخلِ همین صفحه (فقط اسکرول می‌کند، صفحه عوض نمی‌شود)
//   • route: true  → صفحه‌ی مستقلِ دیگری از سایت
// لینک‌های نوعِ دوم با کامپوننتِ Link رندر می‌شوند تا جابه‌جایی بینِ صفحه‌ها بدونِ
// بارگذاریِ کاملِ دوباره انجام شود؛ با <a> ساده، هر کلیک کلِ سایت را از نو بار می‌کرد.
const LINKS = [
  { href: '#hero', label: 'خانه' },
  { href: '#services', label: 'خدمات' },
  { href: '/about', label: 'دربارهٔ ما', route: true },
  { href: '/contact', label: 'تماس با ما', route: true },
];

// یک لینکِ نوار، با انتخابِ خودکارِ نوعِ درست.
function NavLink({ link, className, onClick }) {
  if (link.route) {
    return (
      <Link href={link.href} className={className} onClick={onClick}>
        {link.label}
      </Link>
    );
  }
  return (
    <a href={link.href} className={className} onClick={onClick}>
      {link.label}
    </a>
  );
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openBooking = useBookingStore((s) => s.openBooking);

  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      // throttle با requestAnimationFrame: حداکثر یک محاسبه در هر فریم.
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // گاردِ برابری: اگر مقدار عوض نشده، همان prev برگردانده می‌شود تا
        // React از رندرِ اضافه صرف‌نظر کند (bail-out). پس اسکرول داخلِ یک ناحیه رندر نمی‌سازد.
        setIsScrolled((prev) => {
          const next = window.scrollY > 80;
          return prev === next ? prev : next;
        });
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // همگام‌سازیِ مقدار اولیه (مثلاً وقتی صفحه از وسط باز می‌شود).
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <nav
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        isScrolled
          ? 'bg-[#030303]/80 backdrop-blur-md border-b border-zinc-800/60 py-4 shadow-xl translate-y-0 opacity-100'
          : 'bg-transparent py-6 opacity-0 translate-y-[-10px] pointer-events-none'
      }`}
      style={{ pointerEvents: isScrolled ? 'auto' : 'none' }}
    >
      {/* 🔴 pointer-events-auto از اینجا برداشته شد. نوار تا قبل از اسکرول نامرئی است و
          pointer-events-none می‌گیرد، ولی این کلاس روی فرزند همان را خنثی می‌کرد — یعنی
          دکمه‌های کاملاً نامرئیِ نوار همچنان کلیک می‌گرفتند و لمسِ بالای صفحه‌ی اصلی
          ناخواسته منوی موبایل را باز می‌کرد یا کاربر را به صفحه‌ی رهگیری می‌برد. */}
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg shadow-lg">
            <Scissors className="w-5 h-5 text-black" />
          </div>
          <BrandWordmark className="font-sans font-bold text-xl tracking-wider text-amber-500" />
        </div>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <NavLink key={l.href} link={l} className="text-sm font-medium text-zinc-400 hover:text-amber-500 transition-colors" />
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/track"
            className="flex items-center gap-2 px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-sm font-medium rounded-lg transition-all bg-zinc-900/40"
          >
            <Search className="w-4 h-4 text-amber-500" />
            <span>رهگیری نوبت</span>
          </Link>
          <button
            onClick={openBooking}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black text-sm font-bold rounded-lg transition-all duration-300 transform active:scale-95 shadow-lg shadow-amber-500/10"
          >
            <Calendar className="w-4 h-4" />
            <span>رزرو آنلاین نوبت</span>
          </button>
        </div>

        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="منوی موبایل"
            className="p-2 text-zinc-400 hover:text-zinc-100 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden glass border-t border-zinc-900 mt-4 px-6 py-5 flex flex-col gap-4">
          {LINKS.map((l) => (
            <NavLink
              key={l.href}
              link={l}
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-zinc-300 hover:text-amber-500 py-1 transition-colors"
            />
          ))}
          <div className="h-px bg-zinc-800 my-2" />
          <div className="flex flex-col gap-3">
            <Link href="/track" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-800 text-zinc-300 text-sm font-medium rounded-lg">
              <Search className="w-4 h-4 text-amber-500" />
              <span>رهگیری نوبت</span>
            </Link>
            <button
              onClick={() => {
                openBooking();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-black text-sm font-bold rounded-lg"
            >
              <Calendar className="w-4 h-4" />
              <span>رزرو آنلاین نوبت</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
