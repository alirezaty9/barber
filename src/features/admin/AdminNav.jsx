'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ShieldCheck, LogOut, LayoutDashboard, CalendarClock, PlusCircle, Settings2, CalendarOff, Home } from 'lucide-react';
import { adminLogout } from '@/api/admin';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin', label: 'داشبورد', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'نوبت‌ها', icon: CalendarClock },
  { href: '/admin/manual', label: 'ثبت نوبت دستی', icon: PlusCircle },
  { href: '/admin/timeoff', label: 'مرخصی و بستن ساعت', icon: CalendarOff },
  { href: '/admin/manage', label: 'خدمات و آرایشگر', icon: Settings2 },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    try {
      await adminLogout();
      toast.success('با موفقیت خارج شدید.');
      router.replace('/admin/login');
      router.refresh();
    } catch {
      toast.error('خروج ناموفق بود.');
    }
  };

  return (
    <header className="border-b border-zinc-900 bg-[#030303] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white">پنل مدیریت banad barber</h1>
            <p className="text-[10px] text-zinc-500">مدیریت نوبت‌ها، خدمات و آرایشگران</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-100 transition-colors">
            <Home className="w-4 h-4" /> سایت
          </Link>
          <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors">
            <LogOut className="w-4 h-4" /> خروج
          </button>
        </div>
      </div>

      <nav className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors',
                active ? 'text-amber-500 border-amber-500' : 'text-zinc-400 border-transparent hover:text-zinc-200'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
