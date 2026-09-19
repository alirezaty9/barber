/* سرویس‌ورکرِ بَنَد باربر — سبک و محافظه‌کار.
 * هدف: نصب‌پذیری (installability) + تجربه‌ی آفلاینِ پایه.
 * قواعد کش:
 *   • فقط درخواست‌های GET را دست می‌زنیم.
 *   • مسیرهای حساس (API/ادمین/پرداخت) هرگز کش نمی‌شوند و همیشه از شبکه می‌آیند.
 *   • ناوبری صفحه‌ها: network-first با فال‌بکِ کش و سپس صفحه‌ی آفلاین.
 *   • دارایی‌های استاتیک (_next/static، تصاویر، آیکون‌ها): cache-first.
 */
// 🔁 این شماره را هر وقت قواعدِ کش عوض شد یا خواستی جعبه‌ی کشِ همه‌ی بازدیدکننده‌ها یک‌بار
// خالی شود، یک واحد جلو ببر. موقعِ فعال‌شدنِ نسخه‌ی جدید، کش‌های نسخه‌های قبلی پاک می‌شوند.
// v2 → ۱۴۰۵/۰۶/۲۳: عکس‌ها به فایل‌های اثرانگشت‌دار منتقل شدند و قاعده‌ی فایل‌های نام‌ثابت
//      از cache-first به stale-while-revalidate تغییر کرد.
// v3 → ۱۴۰۵/۰۶/۲۸: دیگر پاسخِ ناموفق (خطای ۴۰۴/۵۰۰ و ریدایرکت) در کشِ صفحه‌ها ذخیره نمی‌شود،
//      و شکستِ یکی از فایل‌های پیش‌کش دیگر کلِ نصبِ سرویس‌ورکر را باطل نمی‌کند.
const VERSION = 'v3';
const STATIC_CACHE = `banad-static-${VERSION}`;
const PAGE_CACHE = `banad-pages-${VERSION}`;
const OFFLINE_URL = '/offline';

// در نصب، صفحه‌ی آفلاین و آیکون‌ها را از پیش کش کن.
//
// ⚠️ عمداً به‌جای addAll یکی‌یکی کش می‌شوند: addAll «همه یا هیچ» است، یعنی اگر فقط یکی از
// این سه فایل در دسترس نباشد (یک دیپلویِ نیمه‌کاره، یک قطعیِ لحظه‌ای)، کلِ نصبِ سرویس‌ورکر
// شکست می‌خورد و کاربر نه تجربه‌ی آفلاین دارد و نه چیزی می‌بیند که بفهمد چرا.
const PRECACHE_URLS = [OFFLINE_URL, '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

// در فعال‌سازی، کش‌های نسخه‌های قدیمی را پاک کن.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isSensitive(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/payment')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // POST/PUT/... را رها کن

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // درخواست‌های خارجی را رها کن
  if (isSensitive(url)) return; // مسیرهای حساس همیشه از شبکه

  // ناوبریِ صفحه‌ها → network-first
  //
  // ⚠️ فقط پاسخِ سالم کش می‌شود. قبلاً هر پاسخی — از جمله صفحه‌ی خطای ۵۰۰ یا ۴۰۴ سرور —
  // ذخیره می‌شد؛ نتیجه‌اش این بود که یک قطعیِ چنددقیقه‌ایِ سرور می‌توانست تا مدت‌ها به‌شکلِ
  // «صفحه‌ی خطای چسبیده» در گوشیِ کاربر باقی بماند، چون بارِ بعد همان را از کش می‌گرفت.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // ── فایل‌هایی که نامشان اثرِ انگشتِ محتوا دارد → cache-first ──
  // هر چیزی زیرِ /_next/static/ (کد، استایل، و عکس‌هایی که با import آمده‌اند) نامش شاملِ
  // هشِ محتواست. پس «همین نام = همین محتوا» همیشه درست است و نگه‌داشتنِ ابدی‌اش بی‌خطر:
  // اگر محتوا عوض شود، نامِ جدید می‌گیرد و خودبه‌خود از شبکه گرفته می‌شود.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
    return;
  }

  // ── فایل‌های استاتیکِ نام‌ثابت (آیکن‌ها، فونت‌ها، هر فایلِ public) → stale-while-revalidate ──
  // این‌ها نامشان بینِ بیلدها عوض نمی‌شود، پس cache-first یعنی «تا ابد نسخه‌ی اول». به‌جایش
  // نسخه‌ی کش‌شده فوراً تحویل داده می‌شود (سرعت حفظ می‌شود) و همزمان نسخه‌ی تازه در پس‌زمینه
  // گرفته و جایگزین می‌شود؛ پس بازدیدِ بعدی نسخه‌ی درست را می‌بیند و فایلِ کهنه برای همیشه
  // گیر نمی‌کند. اگر شبکه در دسترس نباشد، همان نسخه‌ی کش‌شده سرو می‌شود.
  if (/\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fresh = fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || fresh;
        })
      )
    );
  }
});
