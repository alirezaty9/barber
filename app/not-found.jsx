import Link from 'next/link';
import { Scissors } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col items-center justify-center px-6 text-center">
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl mb-6">
        <Scissors className="w-7 h-7" />
      </div>
      <h1 className="text-5xl font-extrabold text-amber-500 mb-2">۴۰۴</h1>
      <p className="text-zinc-400 text-sm mb-8">صفحه‌ای که دنبالش بودید پیدا نشد.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-sm rounded-xl"
      >
        بازگشت به صفحه‌ی اصلی
      </Link>
    </div>
  );
}
