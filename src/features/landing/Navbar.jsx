'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scissors, Calendar, Menu, X, Search } from 'lucide-react';
import { useBookingStore } from '@/features/booking/store';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const openBooking = useBookingStore((s) => s.openBooking);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { href: '#hero', label: 'خانه' },
    { href: '#services', label: 'خدمات' },
    { href: '#contact', label: 'ارتباط با ما' },
  ];

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
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg shadow-lg">
            <Scissors className="w-5 h-5 text-black" />
          </div>
          <span dir="ltr" className="font-sans font-bold text-xl tracking-wider text-amber-500">
            banad <span className="text-zinc-100">barber</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-zinc-400 hover:text-amber-500 transition-colors">
              {l.label}
            </a>
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
        <div className="md:hidden glass border-t border-zinc-900 mt-4 px-6 py-5 flex flex-col gap-4 pointer-events-auto">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-zinc-300 hover:text-amber-500 py-1 transition-colors"
            >
              {l.label}
            </a>
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
