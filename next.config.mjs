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
};

export default nextConfig;
