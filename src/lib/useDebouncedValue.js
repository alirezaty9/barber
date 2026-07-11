'use client';

import { useEffect, useState } from 'react';

// مقدارِ debounce‌شده: تا وقتی ورودی برای `delay` میلی‌ثانیه ثابت نماند، به‌روزرسانی نمی‌شود.
// کاربرد: جلوگیری از طوفانِ درخواست هنگامِ تایپ در فیلدِ جست‌وجو.
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default useDebouncedValue;
