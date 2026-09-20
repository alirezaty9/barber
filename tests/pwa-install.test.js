import { describe, it, expect, vi, afterEach } from 'vitest';
import { isAppleMobile, getInstallGuide } from '@/features/pwa/install-guidance';

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
