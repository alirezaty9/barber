'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { INSTALL_EVENT_KEY, INSTALL_READY_EVENT } from '@/features/pwa/install-keys';

// ─────────────────────────────────────────────────────────────
//  صفحه‌ی تشخیصِ نصبِ اپ — /pwa-check
//
//  🎯 چرا ساخته شد؟ «چرا مرورگر اجازه‌ی نصب نمی‌دهد» از روی کد قابلِ فهم نیست؛ فقط خودِ
//  مرورگرِ کاربر می‌تواند جواب بدهد. این صفحه همه‌ی شرط‌های نصب را زنده نشان می‌دهد تا
//  به‌جای حدس‌زدن، یک اسکرین‌شات کافی باشد.
//
//  ⚠️ این یک ابزارِ موقتِ عیب‌یابی است، نه بخشی از تجربه‌ی مشتری. در نتایجِ گوگل هم ظاهر
//  نمی‌شود و هیچ لینکی در سایت به آن نمی‌دهیم. بعد از حلِ مسئله می‌شود حذفش کرد.
//
//  🔴 گزارش در حافظه‌ی همین تبِ مرورگر (sessionStorage) نگه داشته می‌شود تا با رفتن به
//  صفحه‌ی دیگر و برگشتن **پاک نشود** — چون دقیقاً همان رفت‌وبرگشت است که باید بررسی شود.
// ─────────────────────────────────────────────────────────────

const LOG_KEY = 'pwa-check-log';

function readLog() {
  try {
    const raw = window.sessionStorage.getItem(LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entries) {
  try {
    window.sessionStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-60)));
  } catch { /* حافظه غیرفعال */ }
}

export default function PwaCheckPage() {
  const [log, setLog] = useState([]);
  const [state, setState] = useState(null);
  const [tick, setTick] = useState(0);

  // افزودنِ یک خط به گزارش، با زمانِ ثبتِ همان لحظه.
  const add = useCallback((msg) => {
    const at = new Date();
    const stamp = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}:${String(at.getSeconds()).padStart(2, '0')}`;
    const next = [...readLog(), { stamp, msg }];
    writeLog(next);
    setLog(next);
  }, []);

  // جمع‌کردنِ وضعیتِ فعلیِ همه‌ی شرط‌ها.
  const collect = useCallback(async () => {
    const sw = 'serviceWorker' in navigator;
    let reg = null;
    if (sw) {
      try { reg = await navigator.serviceWorker.getRegistration('/'); } catch { /* نادیده */ }
    }

    // آیا خودِ مرورگر فکر می‌کند این اپ از قبل نصب است؟
    // 🔴 این شرط حیاتی است: اگر کروم اپ را نصب‌شده بداند، اجازه‌ی نصب را **هرگز** اعلام
    // نمی‌کند — هرچقدر هم صبر کنی. و چون در تبِ معمولیِ مرورگر هستی، اپ «نصب‌شده» به نظر
    // نمی‌رسد و این حالت بی‌صدا شبیهِ خرابی می‌شود.
    let related = 'این مرورگر این بررسی را ندارد';
    if (navigator.getInstalledRelatedApps) {
      try {
        const apps = await navigator.getInstalledRelatedApps();
        related = apps.length ? `بله — ${apps.length} مورد` : 'خیر';
      } catch {
        related = 'بررسی خطا داد';
      }
    }

    let manifest = 'در حالِ بررسی…';
    try {
      const res = await fetch('/manifest.webmanifest', { cache: 'no-store' });
      const body = await res.json();
      manifest = `${res.status} — نامِ اپ: ${body.name} — تعدادِ آیکن: ${body.icons?.length ?? 0}`;
    } catch (e) {
      manifest = `خطا: ${e.message}`;
    }

    setState({
      secure: window.isSecureContext,
      origin: window.location.origin,
      swSupported: sw,
      swRegistered: !!reg,
      swScope: reg?.scope ?? '—',
      swInstalling: !!reg?.installing,
      swWaiting: !!reg?.waiting,
      swActive: !!reg?.active,
      swActiveState: reg?.active?.state ?? '—',
      controlling: sw ? !!navigator.serviceWorker.controller : false,
      permissionArrived: !!window[INSTALL_EVENT_KEY],
      standalone:
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true,
      relatedApps: related,
      manifest,
      ua: window.navigator.userAgent,
      sinceLoad: Math.round(performance.now() / 100) / 10,
    });
  }, []);

  useEffect(() => {
    setLog(readLog());
    add('— این صفحه باز شد —');
    collect();

    // اگر اجازه‌ی نصب همین حالا از قبل رسیده بوده، همان اول ثبتش کن.
    if (window[INSTALL_EVENT_KEY]) {
      add(`✅ اجازه‌ی نصب از قبل موجود بود (${Math.round(performance.now())} میلی‌ثانیه پس از باز شدنِ صفحه)`);
    }

    const onReady = () => {
      add(`✅ اجازه‌ی نصب همین الان رسید (${Math.round(performance.now())} میلی‌ثانیه پس از باز شدنِ صفحه)`);
      collect();
    };
    const onInstalled = () => {
      add('📦 مرورگر خبر داد اپ نصب شد');
      collect();
    };

    window.addEventListener(INSTALL_READY_EVENT, onReady);
    window.addEventListener('appinstalled', onInstalled);

    // هر ۲ ثانیه وضعیت را تازه کن تا تغییرِ حالتِ سرویس‌ورکر روی صفحه دیده شود.
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      collect();
    }, 2000);

    return () => {
      window.removeEventListener(INSTALL_READY_EVENT, onReady);
      window.removeEventListener('appinstalled', onInstalled);
      clearInterval(timer);
    };
  }, [add, collect]);

  const tryPrompt = async () => {
    const ev = window[INSTALL_EVENT_KEY];
    if (!ev) {
      add('❌ دکمه‌ی «امتحانِ نصب» زده شد ولی اجازه‌ای در دست نبود');
      return;
    }
    add('👆 دکمه‌ی «امتحانِ نصب» زده شد — پنجره‌ی مرورگر باید باز شود');
    try {
      ev.prompt();
      const { outcome } = await ev.userChoice;
      add(`نتیجه‌ی پنجره‌ی مرورگر: ${outcome}`);
    } catch (e) {
      add(`❌ پنجره باز نشد: ${e.message}`);
    }
    collect();
  };

  const clearLog = () => {
    writeLog([]);
    setLog([]);
  };

  const row = 'flex items-start justify-between gap-4 py-2.5 border-b border-zinc-800 last:border-0';
  const label = 'text-sm text-zinc-400 shrink-0';
  const value = 'text-sm font-bold text-zinc-100 text-left break-all';

  const yesNo = (v) => (v ? '✅ بله' : '❌ خیر');

  return (
    <div dir="rtl" className="min-h-screen bg-[#030303] text-zinc-100 p-5">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="space-y-2">
          <h1 className="text-xl font-extrabold">بررسیِ نصبِ اپ</h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            این صفحه فقط برای عیب‌یابی است. از همین صفحه یک اسکرین‌شاتِ کامل بگیر و بفرست.
            هر ۲ ثانیه خودش تازه می‌شود (تازه‌سازیِ {tick}).
          </p>
        </header>

        {!state ? (
          <p className="text-sm text-zinc-500">در حالِ خواندنِ وضعیت…</p>
        ) : (
          <>
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
              <h2 className="text-sm font-extrabold text-amber-400 mb-1">مهم‌ترین سؤال</h2>
              <div className={row}>
                <span className={label}>اجازه‌ی نصب از مرورگر رسیده؟</span>
                <span className={value}>{yesNo(state.permissionArrived)}</span>
              </div>
              <div className={row}>
                <span className={label}>مرورگر اپ را از قبل نصب‌شده می‌داند؟</span>
                <span className={value}>{state.relatedApps}</span>
              </div>
              <div className={row}>
                <span className={label}>همین حالا داخلِ اپِ نصب‌شده هستی؟</span>
                <span className={value}>{yesNo(state.standalone)}</span>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="text-sm font-extrabold text-zinc-300 mb-1">سرویس‌ورکر (نگهبانِ پس‌زمینه)</h2>
              <div className={row}>
                <span className={label}>مرورگر پشتیبانی می‌کند؟</span>
                <span className={value}>{yesNo(state.swSupported)}</span>
              </div>
              <div className={row}>
                <span className={label}>ثبت شده؟</span>
                <span className={value}>{yesNo(state.swRegistered)}</span>
              </div>
              <div className={row}>
                <span className={label}>فعال است؟</span>
                <span className={value}>{yesNo(state.swActive)} ({state.swActiveState})</span>
              </div>
              <div className={row}>
                <span className={label}>در حالِ نصب / در انتظار؟</span>
                <span className={value}>{state.swInstalling ? 'در حالِ نصب' : state.swWaiting ? 'در انتظار' : 'هیچ‌کدام'}</span>
              </div>
              <div className={row}>
                <span className={label}>کنترلِ همین صفحه را دارد؟</span>
                <span className={value}>{yesNo(state.controlling)}</span>
              </div>
              <div className={row}>
                <span className={label}>دامنه‌ی کارش</span>
                <span className={value}>{state.swScope}</span>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="text-sm font-extrabold text-zinc-300 mb-1">بقیه‌ی شرط‌ها</h2>
              <div className={row}>
                <span className={label}>اتصالِ امن (HTTPS)</span>
                <span className={value}>{yesNo(state.secure)}</span>
              </div>
              <div className={row}>
                <span className={label}>آدرسِ سایت</span>
                <span className={value}>{state.origin}</span>
              </div>
              <div className={row}>
                <span className={label}>فایلِ معرفیِ اپ (manifest)</span>
                <span className={value}>{state.manifest}</span>
              </div>
              <div className={row}>
                <span className={label}>ثانیه از باز شدنِ صفحه</span>
                <span className={value}>{state.sinceLoad} ثانیه</span>
              </div>
              <div className={row}>
                <span className={label}>مرورگر / دستگاه</span>
                <span className={`${value} text-[10px] font-normal`}>{state.ua}</span>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="text-sm font-extrabold text-zinc-300 mb-3">گزارشِ زمانی</h2>
              <ol className="space-y-1.5 text-xs">
                {log.length === 0 && <li className="text-zinc-600">خالی</li>}
                {log.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-zinc-600 shrink-0 font-mono">{l.stamp}</span>
                    <span className="text-zinc-300">{l.msg}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-3">
              <p className="text-xs text-zinc-500 leading-relaxed">
                آزمایشِ اصلی: دکمه‌ی «برو به رهگیری» را بزن، بعد با دکمه‌ی بازگشتِ مرورگر
                برگرد به همین صفحه. گزارشِ زمانیِ بالا پاک نمی‌شود، پس معلوم می‌شود اجازه‌ی
                نصب دقیقاً کِی رسیده.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={tryPrompt}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold rounded-xl"
                >
                  امتحانِ نصب همین حالا
                </button>
                <Link
                  href="/track"
                  className="px-4 py-2.5 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl"
                >
                  برو به رهگیری (جابه‌جاییِ سریع)
                </Link>
                <a
                  href="/track"
                  className="px-4 py-2.5 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl"
                >
                  برو به رهگیری (بارگذاریِ کامل)
                </a>
                <button
                  type="button"
                  onClick={clearLog}
                  className="px-4 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-bold rounded-xl"
                >
                  پاک‌کردنِ گزارش
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
