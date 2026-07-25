import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

// تنظیماتِ Vitest — تست‌واحدِ منطقِ خالص (بدونِ React/DB).
// alias «@» را مثلِ jsconfig به src/ نگاشت می‌کنیم تا importها یکسان بمانند.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,mjs}'],
    globals: true,
    // مقادیرِ ساختگیِ محیط: فقط برای اینکه ساختِ PrismaClient هنگامِ import خطا ندهد.
    // هیچ کوئریِ واقعی‌ای زده نمی‌شود — تست‌های سرور یک client/tx ساختگی پاس می‌دهند.
    env: {
      DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/none',
      DIRECT_URL: 'postgresql://u:p@127.0.0.1:5432/none',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
