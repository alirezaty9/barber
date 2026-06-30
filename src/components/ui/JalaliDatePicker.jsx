'use client';

import dynamic from 'next/dynamic';

// لِیزی‌لود: کتابخانه‌ی سنگینِ تقویم (react-multi-date-picker) فقط زمانی که این
// کامپوننت واقعاً رندر می‌شود دانلود می‌گردد، نه در باندل اولیه‌ی صفحه.
// ssr:false چون کتابخانه فقط سمت کلاینت کار می‌کند.
const JalaliDatePicker = dynamic(() => import('./JalaliDatePickerImpl'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[46px] rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse" />
  ),
});

export default JalaliDatePicker;
