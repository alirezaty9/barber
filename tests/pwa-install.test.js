import { describe, it, expect, vi, afterEach } from 'vitest';
import { isAppleMobile, getInstallGuide } from '@/features/pwa/install-guidance';
import { isInstallPromptHidden, isInstallDismissActive } from '@/features/pwa/install-scope';
import { INSTALL_DISMISS_DAYS } from '@/features/pwa/install-keys';
import { watchInstallPermission, INSTALL_WATCH_MS } from '@/features/pwa/install-watch';
import { INSTALL_READY_EVENT } from '@/features/pwa/install-keys';

// ─────────────────────────────────────────────────────────────
//  راهنمای نصبِ اپلیکیشن (PWA).
//
//  🔴 واقعیتی که این بخش رویش بنا شده: هیچ سایتی نمی‌تواند پنجره‌ی نصبِ مرورگر را
//  به‌زور باز کند. فقط وقتی مرورگر خودش اجازه بدهد این ممکن است، و روی آیفون/آی‌پد
//  اصلاً چنین چیزی وجود ندارد. پس وقتی نصبِ یک‌کلیکی ممکن نیست، کاربر باید مسیرِ دستیِ
//  **دقیقِ همان دستگاه** را ببیند — نه یک پیامِ کلی که به دردش نمی‌خورد.
//
//  این تست‌ها می‌سنجند که هر دستگاه راهنمای درستِ خودش را بگیرد. خرابیِ این منطق هیچ
//  خطایی نمی‌دهد: کاربرِ آیفون دستورِ اندروید می‌خواند، دنبالِ منویی می‌گردد که وجود ندارد،
//  و نتیجه می‌گیرد اپ خراب است.
// ─────────────────────────────────────────────────────────────

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
  ipadOld: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
  ipadNew: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  androidChrome: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
  desktopFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  iosFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/120.0 Mobile/15E148 Safari/605.1.15',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

/** شبیه‌سازیِ مرورگر با یک userAgent و تعدادِ نقاطِ لمسیِ مشخص. */
function asBrowser(userAgent, maxTouchPoints = 0) {
  vi.stubGlobal('window', { navigator: { userAgent, maxTouchPoints } });
}

afterEach(() => vi.unstubAllGlobals());

describe('تشخیصِ دستگاه‌های اپل', () => {
  it('آیفون شناسایی می‌شود', () => {
    asBrowser(UA.iphone);
    expect(isAppleMobile()).toBe(true);
  });

  it('آی‌پدِ قدیمی شناسایی می‌شود', () => {
    asBrowser(UA.ipadOld);
    expect(isAppleMobile()).toBe(true);
  });

  // ⚠️ آی‌پدهای جدید خودشان را «Macintosh» معرفی می‌کنند. بدونِ چکِ لمسی‌بودن، کاربرِ
  // آی‌پد دستورالعملِ «کامپیوتر» می‌گرفت و دنبالِ آیکنی در نوارِ آدرس می‌گشت که ندارد.
  it('آی‌پدِ جدید که خودش را مک معرفی می‌کند، با لمسی‌بودن تشخیص داده می‌شود', () => {
    asBrowser(UA.ipadNew, 5);
    expect(isAppleMobile()).toBe(true);
  });

  it('مکِ واقعی (بدونِ صفحه‌ی لمسی) دستگاهِ اپلِ موبایل شمرده نمی‌شود', () => {
    asBrowser(UA.mac, 0);
    expect(isAppleMobile()).toBe(false);
  });

  it('اندروید و ویندوز اپل نیستند', () => {
    asBrowser(UA.androidChrome, 5);
    expect(isAppleMobile()).toBe(false);
    asBrowser(UA.desktopChrome, 0);
    expect(isAppleMobile()).toBe(false);
  });

  it('روی سرور (بدونِ مرورگر) کرش نمی‌کند', () => {
    vi.stubGlobal('window', undefined);
    expect(isAppleMobile()).toBe(false);
  });
});

describe('راهنمای متناسب با هر دستگاه', () => {
  it('آیفون → مسیرِ سافاری با دکمه‌ی اشتراک‌گذاری', () => {
    asBrowser(UA.iphone);
    const g = getInstallGuide();
    expect(g.title).toContain('آیفون');
    expect(g.steps.join(' ')).toContain('Add to Home Screen');
  });

  // فایرفاکسِ آیفون هم در نهایت سافاری است؛ راهنمای اپل باید مقدم باشد.
  it('فایرفاکسِ آیفون راهنمای اپل می‌گیرد، نه راهنمای فایرفاکس', () => {
    asBrowser(UA.iosFirefox);
    expect(getInstallGuide().title).toContain('آیفون');
  });

  it('فایرفاکسِ دسکتاپ راهنمای مخصوصِ خودش را می‌گیرد', () => {
    asBrowser(UA.desktopFirefox);
    const g = getInstallGuide();
    expect(g.title).toContain('فایرفاکس');
    expect(g.steps.join(' ')).toMatch(/کروم|اِج/);
  });

  it('فایرفاکسِ اندروید هم راهنمای فایرفاکس می‌گیرد', () => {
    asBrowser(UA.androidFirefox);
    expect(getInstallGuide().title).toContain('فایرفاکس');
  });

  it('کرومِ اندروید → منوی سه‌نقطه‌ی گوشی', () => {
    asBrowser(UA.androidChrome);
    const g = getInstallGuide();
    expect(g.title).toContain('اندروید');
    expect(g.steps.join(' ')).toContain('Install app');
  });

  it('کرومِ دسکتاپ → آیکنِ نوارِ آدرس', () => {
    asBrowser(UA.desktopChrome);
    const g = getInstallGuide();
    expect(g.title).toContain('کامپیوتر');
    expect(g.steps.join(' ')).toContain('نوارِ آدرس');
  });

  it('هر راهنما ساختارِ کامل دارد: عنوان، مقدمه و دستِ‌کم دو قدم', () => {
    for (const ua of Object.values(UA)) {
      asBrowser(ua, 5);
      const g = getInstallGuide();
      expect(g.title, ua).toBeTruthy();
      expect(g.intro, ua).toBeTruthy();
      expect(Array.isArray(g.steps), ua).toBe(true);
      expect(g.steps.length, ua).toBeGreaterThanOrEqual(2);
      expect(g.steps.every((s) => typeof s === 'string' && s.length > 10), ua).toBe(true);
    }
  });

  // 🔴 این تفکیک قلبِ ماجراست. روی کروم/اِج دکمه‌ی یک‌کلیکی **می‌آید**، فقط مرورگر چند
  // لحظه صبر می‌کند تا مطمئن شود کاربر واقعاً دارد با سایت کار می‌کند. اگر این فیلد غلط
  // شود، دوباره به کاربرِ کروم می‌گوییم «برو از منو نصب کن» در حالی که چند ثانیه بعد
  // دکمه برایش فعال می‌شود — و او نتیجه می‌گیرد اپ خراب است.
  it('کروم و اِج می‌توانند بعداً دکمه‌ی یک‌کلیکی بدهند', () => {
    asBrowser(UA.desktopChrome);
    expect(getInstallGuide().canPromptEventually).toBe(true);
    asBrowser(UA.androidChrome);
    expect(getInstallGuide().canPromptEventually).toBe(true);
  });

  it('آیفون و فایرفاکس هرگز دکمه‌ی یک‌کلیکی نخواهند داشت', () => {
    asBrowser(UA.iphone);
    expect(getInstallGuide().canPromptEventually).toBe(false);
    asBrowser(UA.ipadNew, 5);
    expect(getInstallGuide().canPromptEventually).toBe(false);
    asBrowser(UA.desktopFirefox);
    expect(getInstallGuide().canPromptEventually).toBe(false);
    asBrowser(UA.androidFirefox);
    expect(getInstallGuide().canPromptEventually).toBe(false);
  });

  it('هر راهنما این فیلد را دارد و حتماً بولین است', () => {
    for (const ua of Object.values(UA)) {
      asBrowser(ua, 5);
      expect(typeof getInstallGuide().canPromptEventually, ua).toBe('boolean');
    }
  });

  it('هیچ راهنمایی وعده‌ی نصبِ خودکار نمی‌دهد — همه مسیرِ دستی‌اند', () => {
    // این راهنماها فقط وقتی دیده می‌شوند که نصبِ یک‌کلیکی ممکن **نباشد**؛ پس نباید
    // کاربر را به دنبالِ دکمه‌ای بفرستند که روی صفحه وجود ندارد.
    for (const ua of Object.values(UA)) {
      asBrowser(ua, 5);
      const all = getInstallGuide().steps.join(' ');
      expect(all, ua).not.toMatch(/دکمه‌ی نصبِ (بالا|زیر)/);
    }
  });
});

// ─────────────────────────────────────────────────────────────
//  کادرِ دعوت به نصب از کجا تا کجا؟
//
//  از وقتی این کادر در ریشه‌ی صفحه رندر می‌شود، روی **همه‌ی** مسیرها می‌آید. خرابیِ این
//  منطق هیچ خطایی نمی‌دهد: یا کادر روی پنلِ مدیریت و صفحه‌ی نتیجه‌ی پرداخت می‌افتد، یا
//  بی‌صدا از صفحه‌های مشتری غیب می‌شود.
// ─────────────────────────────────────────────────────────────
describe('مسیرهایی که کادرِ نصب در آن‌ها پنهان است', () => {
  it('در پنلِ مدیریت و زیرصفحه‌هایش پنهان است', () => {
    expect(isInstallPromptHidden('/admin')).toBe(true);
    expect(isInstallPromptHidden('/admin/bookings')).toBe(true);
    expect(isInstallPromptHidden('/admin/settings/services')).toBe(true);
  });

  it('در صفحه‌های برگشت از درگاهِ پرداخت پنهان است', () => {
    expect(isInstallPromptHidden('/payment')).toBe(true);
    expect(isInstallPromptHidden('/payment/result')).toBe(true);
  });

  it('در صفحه‌های مشتری دیده می‌شود', () => {
    for (const p of ['/', '/track', '/about', '/contact', '/terms', '/offline']) {
      expect(isInstallPromptHidden(p), p).toBe(false);
    }
  });

  // ⚠️ اگر مقایسه startsWith خالی بود، این مسیرهای فرضیِ آینده هم اشتباهی پنهان می‌شدند.
  it('مسیری که فقط نامش با مستثناها شروع می‌شود پنهان نمی‌شود', () => {
    expect(isInstallPromptHidden('/administration')).toBe(false);
    expect(isInstallPromptHidden('/payments-faq')).toBe(false);
  });

  it('با مسیرِ نامعلوم (null/undefined) کرش نمی‌کند و پنهان نمی‌کند', () => {
    expect(isInstallPromptHidden(null)).toBe(false);
    expect(isInstallPromptHidden(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
//  زیرِ نظر گرفتنِ اجازه‌ی نصب.
//
//  🔴 باگی که این بخش محافظش است: اجازه‌ی نصب در حافظه‌ی مرورگر می‌نشیند و وضعیتِ داخلیِ
//  اپ فقط یک رونوشت از آن است. اگر رونوشت فقط با یک خبرِ **یک‌بارمصرف** تازه شود، هر
//  دلیلی که باعث نشنیدنِ آن خبر شود، دکمه‌ی نصب را **برای همیشه** خاموش نگه می‌دارد —
//  بدونِ هیچ خطایی، و فقط با رفتن به صفحه‌ی دیگر و برگشتن درست می‌شود.
// ─────────────────────────────────────────────────────────────
describe('زیرِ نظر گرفتنِ اجازه‌ی نصب', () => {
  /** یک window/document ساختگی که فقط شنونده‌ها را می‌شمارد. */
  function fakeTarget() {
    const listeners = new Map();
    return {
      listeners,
      addEventListener: (type, fn) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
      },
      removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
      emit: (type) => listeners.get(type)?.forEach((fn) => fn()),
      count: () => [...listeners.values()].reduce((n, s) => n + s.size, 0),
    };
  }

  function setup() {
    const win = fakeTarget();
    const doc = fakeTarget();
    const sync = vi.fn();
    let clock = 0;
    const stop = watchInstallPermission(sync, { win, doc, now: () => clock });

    // ⚠️ زمان را قدم‌به‌قدم جلو می‌بریم، نه یکجا: اگر ساعتِ ساختگی را یک‌باره ۶۰ ثانیه جلو
    // ببری، زمان‌سنج در همان **اولین** اجرایش می‌بیند که مهلت تمام شده و خودش را خاموش
    // می‌کند — یعنی تست چیزی را می‌سنجید که در واقعیت رخ نمی‌دهد.
    const STEP = 250;
    const tick = (ms) => {
      for (let passed = 0; passed < ms; passed += STEP) {
        clock += STEP;
        vi.advanceTimersByTime(STEP);
      }
    };
    return { win, doc, sync, stop, tick };
  }

  afterEach(() => vi.useRealTimers());

  // 🔴 قلبِ ماجرا: حتی اگر هیچ خبری نرسد، باید خودمان نگاه کنیم.
  it('بدونِ رسیدنِ هیچ خبری هم هر ثانیه خودش نگاه می‌کند', () => {
    vi.useFakeTimers();
    const { sync, tick } = setup();

    expect(sync).not.toHaveBeenCalled();
    tick(1000);
    expect(sync).toHaveBeenCalledTimes(1);
    tick(3000);
    expect(sync).toHaveBeenCalledTimes(4);
  });

  it('با رسیدنِ خبرِ «اجازه آماده است» فوراً نگاه می‌کند', () => {
    vi.useFakeTimers();
    const { win, sync } = setup();

    win.emit(INSTALL_READY_EVENT);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it('با برگشتنِ کاربر به تب هم نگاه می‌کند', () => {
    vi.useFakeTimers();
    const { win, doc, sync } = setup();

    // ⚠️ خبرِ «تب دیده شد» روی document اعلام می‌شود، نه window. اگر روی window گوش
    // می‌دادیم این تست می‌شکست — و در مرورگر بی‌صدا کار نمی‌کرد.
    doc.emit('visibilitychange');
    expect(sync).toHaveBeenCalledTimes(1);

    win.emit('pageshow');
    expect(sync).toHaveBeenCalledTimes(2);
  });

  // نگاه‌کردنِ ابدی کارِ بی‌خودی است؛ مرورگر تصمیمش را در ثانیه‌های اول می‌گیرد.
  it('بعد از یک دقیقه دیگر خودش نگاه نمی‌کند', () => {
    vi.useFakeTimers();
    const { sync, tick } = setup();

    tick(INSTALL_WATCH_MS);
    const atLimit = sync.mock.calls.length;
    expect(atLimit).toBe(INSTALL_WATCH_MS / 1000);

    tick(30_000);
    expect(sync).toHaveBeenCalledTimes(atLimit);
  });

  // 🔴 نشتِ شنونده: این کامپوننت در چند جای صفحه استفاده می‌شود و با هر جابه‌جایی بینِ
  // صفحه‌ها دوباره ساخته می‌شود. اگر پاک‌سازی ناقص باشد، شنونده‌ها روی هم تلنبار می‌شوند.
  it('پاک‌سازی همه‌ی شنونده‌ها و زمان‌سنج را برمی‌دارد', () => {
    vi.useFakeTimers();
    const { win, doc, sync, stop, tick } = setup();

    expect(win.count() + doc.count()).toBe(3);
    stop();
    expect(win.count() + doc.count()).toBe(0);

    win.emit(INSTALL_READY_EVENT);
    doc.emit('visibilitychange');
    tick(5000);
    expect(sync).not.toHaveBeenCalled();
  });

  it('روی سرور (جایی که مرورگر نیست) کرش نمی‌کند', () => {
    const sync = vi.fn();
    const stop = watchInstallPermission(sync, { win: null, doc: null });
    expect(() => stop()).not.toThrow();
    expect(sync).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
//  «کاربر کادر را بست» — تا کِی؟
//
//  خرابیِ این منطق دو شکلِ بی‌صدا دارد و هیچ‌کدام خطا نمی‌دهند: یا کادر برای همیشه ناپدید
//  می‌شود (مشتری هیچ‌وقت پیشنهادِ نصب نمی‌بیند)، یا بستن هیچ اثری ندارد و هر بار برمی‌گردد.
// ─────────────────────────────────────────────────────────────
describe('اعتبارِ بستنِ کادرِ نصب', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const WINDOW = INSTALL_DISMISS_DAYS * DAY;
  const NOW = 1_800_000_000_000; // یک زمانِ ثابت و دلخواه

  it('تصمیمِ کاربر رعایت شده: مدتِ سکوت یک هفته است', () => {
    expect(INSTALL_DISMISS_DAYS).toBe(7);
  });

  it('اگر هیچ‌وقت بسته نشده، کادر نشان داده می‌شود', () => {
    expect(isInstallDismissActive(null, NOW, WINDOW)).toBe(false);
    expect(isInstallDismissActive('', NOW, WINDOW)).toBe(false);
  });

  it('بستنِ همین حالا و بستنِ دو روز پیش، هنوز معتبر است', () => {
    expect(isInstallDismissActive(String(NOW), NOW, WINDOW)).toBe(true);
    expect(isInstallDismissActive(String(NOW - 2 * DAY), NOW, WINDOW)).toBe(true);
  });

  it('درست بعد از یک هفته کادر برمی‌گردد', () => {
    // یک لحظه قبل از پایانِ مهلت: هنوز ساکت
    expect(isInstallDismissActive(String(NOW - WINDOW + 1000), NOW, WINDOW)).toBe(true);
    // دقیقاً در لحظه‌ی پایان و بعدش: دوباره نشان بده
    expect(isInstallDismissActive(String(NOW - WINDOW), NOW, WINDOW)).toBe(false);
    expect(isInstallDismissActive(String(NOW - 8 * DAY), NOW, WINDOW)).toBe(false);
  });

  // ⚠️ مقدارِ نسخه‌ی قدیمی که معنایش «برای همیشه ببند» بود.
  it('مقدارِ قدیمیِ «۱» منقضی حساب می‌شود، نه ابدی', () => {
    expect(isInstallDismissActive('1', NOW, WINDOW)).toBe(false);
    expect(isInstallDismissActive('0', NOW, WINDOW)).toBe(false);
  });

  it('مقدارِ خراب یا نامعلوم کادر را خفه نمی‌کند', () => {
    for (const bad of ['abc', 'NaN', '{}', 'Infinity', '-5']) {
      expect(isInstallDismissActive(bad, NOW, WINDOW), bad).toBe(false);
    }
  });

  // 🔴 اگر ساعتِ دستگاه جلو باشد و بعد درست شود، یک تاریخِ «آینده» ذخیره می‌ماند که با
  // مقایسه‌ی ساده تا ابد معتبر می‌ماند و کادر را برای همیشه خفه می‌کند.
  it('تاریخِ آینده (ساعتِ دستگاه جلو بوده) نامعتبر است', () => {
    expect(isInstallDismissActive(String(NOW + DAY), NOW, WINDOW)).toBe(false);
  });
});
