/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ایمپورتِ آیکون‌های lucide-react را per-icon و tree-shake می‌کند تا باندلِ ادمین سبک بماند.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // ── هدرهای امنیتی (هیچ‌کدام به‌صورت پیش‌فرض در Next وجود ندارند) ──
  //
  // X-Frame-Options: DENY — جلوی «clickjacking» را می‌گیرد؛ یعنی مهاجم نمی‌تواند صفحه‌ی
  //   مدیریتِ تو را داخلِ یک قابِ نامرئی در سایتِ خودش بگذارد و با فریبِ کلیک، از طرفِ
  //   تویِ لاگین‌شده دکمه‌ی «حذفِ نوبت» را بزند.
  // X-Content-Type-Options: nosniff — مرورگر حق ندارد نوعِ فایل را خودش حدس بزند؛
  //   جلوی اجراشدنِ یک فایلِ آپلودی به‌عنوانِ اسکریپت را می‌گیرد.
  // Referrer-Policy — آدرسِ کاملِ صفحه (که می‌تواند کدِ رهگیری داشته باشد) به سایت‌های
  //   دیگر فرستاده نشود.
  // Strict-Transport-Security — به مرورگر می‌گوید این دامنه را فقط با https باز کن، پس
  //   بازدیدِ اولِ http هم قابلِ شنود نمی‌مانَد.
  //
  // ⚠️ عمداً CSP گذاشته نشد: CSP بدونِ آزمایشِ مرحله‌ایِ روی سایتِ واقعی، احتمالِ بالایی
  // دارد که استایل یا اسکریپتِ خودِ Next را ببندد و صفحه را بشکند. (یادداشتش در pending.md)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
