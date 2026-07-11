'use client';

import { useRef, useEffect } from 'react';
import { createLogger } from './logger';

// ─────────────────────────────────────────────────────────────
//  هوکِ ردیابیِ رندر — برای پیداکردنِ «رندرهای اضافه».
//  هر رندر را می‌شمارد و می‌گوید کدام prop/state عوض شده که باعثِ رندر شده؛
//  اگر رندری بدونِ تغییرِ ورودی رخ دهد، به‌صورتِ warn هشدار می‌دهد (کاندید بهینه‌سازی).
//
//  استفاده (بالای کامپوننت):
//    useRenderLog('Navbar', { isScrolled, mobileMenuOpen });
//
//  نکته: چون reactStrictMode روشن است، در حالتِ توسعه هر رندر ممکن است
//  دوبار دیده شود — این طبیعی است و فقط در dev رخ می‌دهد.
// ─────────────────────────────────────────────────────────────
export function useRenderLog(name, watched = {}) {
  const log = useRef(createLogger(`render:${name}`)).current;
  const count = useRef(0);
  const prev = useRef(null);

  // ⚠️ مهم: شمارش و لاگ باید در فازِ commit اجرا شود، نه در زمانِ رندر.
  // اگر این side-effectها را مستقیم در بدنه‌ی رندر بگذاریم، چون رندر باید «خالص» باشد،
  // StrictMode و رندرِ concurrent (که تابعِ رندر را چند بار صدا می‌زنند و بعضی رندرها را
  // دور می‌ریزند) باعثِ شمارشِ کاذب و آژیرِ «رندرِ اضافه»ی دروغین می‌شوند.
  // useEffect فقط برای رندرهایی که واقعاً commit شده‌اند، یک‌بار اجرا می‌شود.
  useEffect(() => {
    count.current += 1;
    if (count.current === 1) {
      log.info('mount (render #1)');
    } else {
      const changed = {};
      for (const k of Object.keys(watched)) {
        if (!Object.is(prev.current?.[k], watched[k])) {
          changed[k] = { from: prev.current?.[k], to: watched[k] };
        }
      }
      const keys = Object.keys(changed);
      if (keys.length) log.debug(`render #${count.current} — تغییر: ${keys.join(', ')}`, changed);
      else log.warn(`render #${count.current} — بدونِ تغییرِ ورودی‌ها (رندرِ احتمالاً اضافه)`);
    }
    prev.current = watched;
  });

  useEffect(() => () => log.debug(`unmount (بعد از ${count.current} رندر)`), [log]);
}

export default useRenderLog;
