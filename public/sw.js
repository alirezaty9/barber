/* سرویس‌ورکرِ بَنَد باربر — سبک و محافظه‌کار.
 * هدف: نصب‌پذیری (installability) + تجربه‌ی آفلاینِ پایه.
 * قواعد کش:
 *   • فقط درخواست‌های GET را دست می‌زنیم.
 *   • مسیرهای حساس (API/ادمین/پرداخت) هرگز کش نمی‌شوند و همیشه از شبکه می‌آیند.
 *   • ناوبری صفحه‌ها: network-first با فال‌بکِ کش و سپس صفحه‌ی آفلاین.
 *   • دارایی‌های استاتیک (_next/static، تصاویر، آیکون‌ها): cache-first.
 */
const VERSION = 'v1';
const STATIC_CACHE = `banad-static-${VERSION}`;
const PAGE_CACHE = `banad-pages-${VERSION}`;
const OFFLINE_URL = '/offline';

// در نصب، صفحه‌ی آفلاین و آیکون‌ها را از پیش کش کن.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([OFFLINE_URL, '/icon-192.png', '/icon-512.png'])
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
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // دارایی‌های استاتیک → cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/images/') ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)
  ) {
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
  }
});
