'use client';

import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex flex-col items-center justify-center px-6 text-center">
      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl mb-6">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h1 className="text-xl font-extrabold text-white mb-2">خطایی رخ داد</h1>
      <p className="text-zinc-400 text-sm mb-8 max-w-sm">متأسفانه مشکلی پیش آمد. لطفاً دوباره تلاش کنید.</p>
      {/* راهِ دوم لازم است: اگر خطا پایدار باشد (مثلاً چند دقیقه قطعیِ دیتابیس)، «تلاش دوباره»
          هر بار همان خطا را می‌دهد و کاربر بدونِ هیچ راهِ خروجی در همان صفحه گیر می‌کند. */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-sm rounded-xl"
        >
          تلاش دوباره
        </button>
        <a href="/" className="px-6 py-3 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors">
          بازگشت به صفحه اصلی
        </a>
      </div>
    </div>
  );
}
