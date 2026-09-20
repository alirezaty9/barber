'use client';

// خطاهای سطح ریشه (شامل خطای layout) — باید html/body خودش را داشته باشد.
export default function GlobalError({ reset }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ background: '#030303', color: '#f5f5f5', fontFamily: 'sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>خطای غیرمنتظره</h1>
          <p style={{ color: '#a1a1aa', fontSize: 14 }}>لطفاً صفحه را دوباره بارگذاری کنید.</p>
          {/* راهِ خروج، برای وقتی که خطا با تلاشِ دوباره برطرف نمی‌شود. */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{ padding: '12px 24px', background: '#f59e0b', color: '#000', fontWeight: 800, borderRadius: 12, border: 'none', cursor: 'pointer' }}
            >
              تلاش دوباره
            </button>
            <a
              href="/"
              style={{ padding: '12px 24px', border: '1px solid #3f3f46', color: '#d4d4d8', fontSize: 14, borderRadius: 12, textDecoration: 'none' }}
            >
              بازگشت به صفحه اصلی
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
