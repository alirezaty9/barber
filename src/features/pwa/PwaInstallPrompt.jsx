'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { usePwaInstall } from './usePwaInstall';
import { isAppleMobile, showManualInstallHelp } from './install-guidance';
import { cn } from '@/lib/utils';

// کلیدِ «کاربر پاپ‌آپ را بست» در حافظه‌ی مرورگر تا دوباره اذیتش نکند.
const DISMISS_KEY = 'pwa-prompt-dismissed';

// کادرِ چسبیده به پایینِ صفحه برای نصبِ اپ.
//
// چرا لازم است؟ آیکنِ نصب در ردیفِ آیکن‌های بالای صفحه هست، ولی روی موبایل هیچ برچسبی
// ندارد (تولتیپش فقط با موس کار می‌کند) — یعنی مشتری از وجودش خبردار نمی‌شود. این کادر
// خودش یک‌بار جلوی چشم می‌آید و بعد از بسته‌شدن دیگر برنمی‌گردد.
//
// ✅ هماهنگی با آیکنِ بالا: هر دو از یک وضعیتِ مشترک می‌خوانند (install-store) و از یک
//    متنِ راهنمای مشترک استفاده می‌کنند (install-guidance)، پس هیچ‌وقت دو چیز متفاوت
//    نمی‌گویند و مصرفِ اجازه توسطِ یکی، دیگری را بی‌صدا از کار نمی‌اندازد.
export default function PwaInstallPrompt() {
  const { installed, canInstall, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // پیش‌فرض مخفی تا وضعیت از حافظه خوانده شود
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
    setIsIOS(isAppleMobile());
  }, []);

  // نمایش وقتی: نصب نشده، بسته نشده، و یا مرورگر نصب را پشتیبانی می‌کند یا آیفون است.
  const visible = !installed && !dismissed && (canInstall || isIOS);

  const close = () => {
    setDismissed(true);
    try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch { /* حافظه غیرفعال */ }
  };

  const onInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      toast.success('اپ روی صفحه‌ی اصلیِ دستگاه شما اضافه شد ✅');
      close();
    } else if (outcome === 'dismissed') {
      // کاربر پنجره‌ی خودِ مرورگر را رد کرد — کادر را هم می‌بندیم تا تکرار نشود.
      close();
    } else {
      // 'unavailable' → معمولاً آیفون؛ همان راهنمایی که آیکنِ بالای صفحه هم می‌دهد.
      showManualInstallHelp();
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 transition-transform duration-300',
        visible ? 'translate-y-0' : 'translate-y-full'
      )}
      // وقتی مخفی است باید کاملاً از دسترس خارج شود. aria-hidden به‌تنهایی کافی نیست:
      // کادر فقط به پایینِ صفحه سُر می‌خورد ولی هنوز در صفحه هست، پس دکمه‌های «نصب» و
      // «بستن» همچنان با کلیدِ Tab انتخاب می‌شدند — کاربر روی دکمه‌ای می‌رفت که نمی‌دیدش.
      // inert آن بخش را یکجا از کیبورد، ماوس و اسکرین‌ریدر خارج می‌کند.
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="mx-auto max-w-lg m-3 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur shadow-2xl shadow-black/50 p-4 flex items-center gap-3">
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-white">نصب اپلیکیشن</p>
          <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
            برای دسترسیِ سریع‌تر، اپ را روی صفحه‌ی اصلیِ گوشی‌ات نصب کن.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onInstall}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold rounded-xl transition-colors active:scale-95"
          >
            <Download className="w-4 h-4" /> نصب
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="بستن"
            className="p-2 text-zinc-500 hover:text-zinc-300 rounded-xl border border-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
