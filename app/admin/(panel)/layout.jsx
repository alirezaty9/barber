import AdminNav from '@/features/admin/AdminNav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'پنل مدیریت | banad barber',
};

// این layout فقط صفحات محافظت‌شده‌ی پنل را در بر می‌گیرد؛ صفحه‌ی /admin/login خارج از
// این route group است و این چِرم را نمی‌گیرد.
export default function PanelLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
