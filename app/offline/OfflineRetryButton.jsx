'use client';

import { RotateCw } from 'lucide-react';

// دکمه‌ی «تلاش دوباره»ی صفحه‌ی آفلاین. جدا شده چون به رویدادِ کلیک نیاز دارد و خودِ صفحه
// عمداً کامپوننتِ سروری مانده است.
export default function OfflineRetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-sm font-extrabold rounded-xl"
    >
      <RotateCw className="w-4 h-4" />
      تلاش دوباره
    </button>
  );
}
