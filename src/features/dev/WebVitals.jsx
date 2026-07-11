'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { createLogger } from '@/lib/logger';

const log = createLogger('vitals');

// آستانه‌های [خوب، قابل‌قبول] بر اساس استانداردِ Core Web Vitals گوگل.
// بالاتر از حدِ دوم = ضعیف.
const THRESH = {
  LCP: [2500, 4000], // بزرگ‌ترین محتوا چه زمانی دیده شد
  INP: [200, 500], // پاسخ‌گویی به تعامل
  CLS: [0.1, 0.25], // جابه‌جاییِ ناگهانیِ چیدمان
  FCP: [1800, 3000], // اولین محتوا
  TTFB: [800, 1800], // زمان تا اولین بایتِ سرور
};

// گزارشِ زندهٔ سرعتِ صفحه در کنسول (فقط جایی که لاگر روشن است — یعنی توسعه).
export default function WebVitals() {
  useReportWebVitals((m) => {
    const t = THRESH[m.name];
    const rating = !t ? '' : m.value <= t[0] ? '🟢 خوب' : m.value <= t[1] ? '🟡 متوسط' : '🔴 ضعیف';
    const val = m.name === 'CLS' ? m.value.toFixed(3) : `${Math.round(m.value)}ms`;
    const line = `${m.name} = ${val}  ${rating}`;
    if (t && m.value > t[1]) log.warn(line);
    else log.info(line);
  });
  return null;
}
