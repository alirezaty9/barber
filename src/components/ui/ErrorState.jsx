'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import Button from './Button';

// کادرِ «چیزی درست کار نکرد» با دکمه‌ی تلاشِ دوباره.
//
// 🎯 چرا این کامپوننت ساخته شد؟ صفحاتِ پنل فقط دو حالت داشتند: «در حال بارگذاری» و «خالی».
// وقتی درخواست شکست می‌خورد (قطعیِ دیتابیس، یا منقضی‌شدنِ نشستِ ادمین) حالتِ بارگذاری تمام
// می‌شد و داده خالی می‌مانَد، پس همان پیامِ «موردی یافت نشد» نمایش داده می‌شد — یعنی ادمین
// باور می‌کرد داده‌هایش پاک شده‌اند. حالا خطا از خالی‌بودن تفکیک می‌شود.
//
// پیامِ ۴۰۱ جداگانه ترجمه می‌شود، چون راهِ حلش با بقیه‌ی خطاها فرق دارد (ورودِ دوباره).
export default function ErrorState({ error, onRetry, className = '' }) {
  const expiredSession = error?.status === 401;
  const message = expiredSession
    ? 'نشستِ شما منقضی شده است. لطفاً دوباره وارد شوید.'
    : error?.message || 'در دریافت اطلاعات مشکلی پیش آمد.';

  return (
    <div className={`glass p-10 rounded-3xl text-center flex flex-col items-center ${className}`}>
      <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
      <p className="text-sm font-semibold text-zinc-200">{message}</p>
      {expiredSession ? (
        <a href="/admin/login" className="mt-5 text-xs font-bold text-amber-400 hover:text-amber-300">
          رفتن به صفحه‌ی ورود
        </a>
      ) : (
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-5">
            <RotateCw className="w-4 h-4" /> تلاش دوباره
          </Button>
        )
      )}
    </div>
  );
}
