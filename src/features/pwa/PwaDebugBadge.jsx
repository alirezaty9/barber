'use client';

import { useEffect, useState } from 'react';
import { usePwaInstallStore } from './install-store';
import { INSTALL_EVENT_KEY, INSTALL_READY_EVENT } from './install-keys';

// ─────────────────────────────────────────────────────────────
//  نشانِ عیب‌یابیِ نصب — روی **هر** صفحه‌ای، فقط با افزودنِ ?pwadebug=1 به آدرس.
//
//  🎯 چرا لازم شد؟ صفحه‌ی /pwa-check نشان داد اجازه‌ی نصب در کمتر از یک ثانیه می‌رسد، ولی
//  روی صفحه‌ی اصلی چند دقیقه هم که صبر کنی نمی‌رسد. پس مسئله مخصوصِ یک صفحه است و باید
//  همان‌جا اندازه‌گیری شود، نه در یک صفحه‌ی جدا.
//
//  🔴 چیزی که این نشان می‌سنجد و /pwa-check نمی‌سنجید:
//    • آیا اسکریپتِ گیرنده‌ی اجازه در این صفحه **اصلاً اجرا شده**؟
//    • آیا مقدارِ ذخیره‌شده در حافظه‌ی مرورگر با چیزی که کدِ صفحه فکر می‌کند **یکی است**؟
//      اگر این دو با هم فرق داشته باشند، ایراد در کدِ ماست نه در مرورگر — و برعکس.
//
//  گزارش در حافظه‌ی همین تبِ مرورگر می‌ماند، پس با رفتن به صفحه‌ی دیگر و برگشتن پاک نمی‌شود.
//  ⚠️ ابزارِ موقت. بدونِ ?pwadebug=1 هیچ‌چیز نشان نمی‌دهد و هیچ کاری نمی‌کند.
// ─────────────────────────────────────────────────────────────

const LOG_KEY = 'pwa-debug-timeline';

function readLog() {
  try {
    const raw = window.sessionStorage.getItem(LOG_KEY);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function pushLog(msg) {
  try {
    const at = new Date();
    const stamp = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}:${String(at.getSeconds()).padStart(2, '0')}`;
    const next = [...readLog(), { stamp, msg }].slice(-40);
    window.sessionStorage.setItem(LOG_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export default function PwaDebugBadge() {
  const [on, setOn] = useState(false);
  const [log, setLog] = useState([]);
  const [snap, setSnap] = useState(null);
  const canInstall = usePwaInstallStore((s) => s.canInstall);
  const installed = usePwaInstallStore((s) => s.installed);

  useEffect(() => {
    if (!window.location.search.includes('pwadebug=1')) return;
    setOn(true);

    const path = window.location.pathname;
    setLog(pushLog(`— «${path}» باز شد (کدِ صفحه در ${Math.round(performance.now())} م‌ث آماده شد) —`));

    if (window[INSTALL_EVENT_KEY]) {
      setLog(pushLog('✅ اجازه‌ی نصب از قبل در حافظه بود'));
    }

    const onReady = () => {
      setLog(pushLog(`✅ خبرِ «اجازه رسید» شنیده شد (${Math.round(performance.now())} م‌ث)`));
    };
    window.addEventListener(INSTALL_READY_EVENT, onReady);

    const timer = setInterval(() => {
      setSnap({
        captureRan: !!window.__pwaCaptureReady,
        swBooted: !!window.__swBooted,
        windowHas: !!window[INSTALL_EVENT_KEY],
        controller: 'serviceWorker' in navigator ? !!navigator.serviceWorker.controller : false,
        since: Math.round(performance.now() / 100) / 10,
        path: window.location.pathname,
      });
    }, 500);

    return () => {
      window.removeEventListener(INSTALL_READY_EVENT, onReady);
      clearInterval(timer);
    };
  }, []);

  if (!on || !snap) return null;

  const yn = (v) => (v ? '✅' : '❌');
  const line = 'flex justify-between gap-3 py-0.5';

  return (
    <div
      dir="rtl"
      className="fixed top-2 right-2 z-[999] w-[290px] max-h-[75vh] overflow-auto rounded-xl border border-amber-500/40 bg-black/95 p-3 text-[11px] text-zinc-200 shadow-2xl"
    >
      <p className="font-extrabold text-amber-400 mb-1.5">عیب‌یابیِ نصب — {snap.path}</p>

      <div className={line}>
        <span className="text-zinc-400">اسکریپتِ گیرنده اجرا شد؟</span>
        <b>{yn(snap.captureRan)}</b>
      </div>
      <div className={line}>
        <span className="text-zinc-400">اسکریپتِ سرویس‌ورکر اجرا شد؟</span>
        <b>{yn(snap.swBooted)}</b>
      </div>
      <div className={line}>
        <span className="text-zinc-400">سرویس‌ورکر کنترل دارد؟</span>
        <b>{yn(snap.controller)}</b>
      </div>

      <div className="h-px bg-zinc-800 my-1.5" />

      <div className={line}>
        <span className="text-zinc-400">اجازه در حافظه‌ی مرورگر</span>
        <b>{yn(snap.windowHas)}</b>
      </div>
      <div className={line}>
        <span className="text-zinc-400">کدِ صفحه فکر می‌کند اجازه هست</span>
        <b>{yn(canInstall)}</b>
      </div>
      <div className={line}>
        <span className="text-zinc-400">کدِ صفحه فکر می‌کند نصب است</span>
        <b>{yn(installed)}</b>
      </div>

      {snap.windowHas !== canInstall && (
        <p className="mt-1.5 rounded-lg bg-red-500/15 border border-red-500/40 p-1.5 text-red-300 font-bold">
          🔴 این دو با هم نمی‌خوانند — ایراد در کدِ ماست.
        </p>
      )}

      <div className={line}>
        <span className="text-zinc-400">ثانیه از باز شدنِ صفحه</span>
        <b>{snap.since}</b>
      </div>

      <div className="h-px bg-zinc-800 my-1.5" />
      <p className="text-zinc-400 mb-1">گزارشِ زمانی:</p>
      <ol className="space-y-0.5">
        {log.map((l, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-zinc-600 font-mono shrink-0">{l.stamp}</span>
            <span>{l.msg}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
