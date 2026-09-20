import { redirect } from 'next/navigation';
import AdminNav from '@/features/admin/AdminNav';
import { isAuthenticated } from '@/lib/auth';
import { SHOP_NAME } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: `پنل مدیریت | ${SHOP_NAME}`,
};

// این layout فقط صفحات محافظت‌شده‌ی پنل را در بر می‌گیرد؛ صفحه‌ی /admin/login خارج از
// این route group است و این چِرم را نمی‌گیرد.
//
// 🔒 لایه‌ی دومِ احرازِ هویت (مستقل از middleware). خودِ middleware امروز درست کار می‌کند،
// ولی یک دفاعِ تک‌لایه‌ی شکننده است: یک ویرایشِ آینده در الگوی مسیرهایش می‌تواند بی‌هیچ
// خطایی کلِ پنل — و با آن نام و موبایلِ همه‌ی مشتری‌ها — را عمومی کند. این چک در لایه‌ی
// داده است و مستقل از آن الگو عمل می‌کند.
export default async function PanelLayout({ children }) {
  if (!(await isAuthenticated())) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100">
      <AdminNav />
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
