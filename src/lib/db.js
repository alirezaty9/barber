import { PrismaClient } from '@prisma/client';
import { createLogger } from './logger';

// در محیط توسعه، Next ماژول‌ها را hot-reload می‌کند و هر بار یک PrismaClient جدید
// ساخته می‌شود که باعث هشدار «too many connections» می‌شود. با نگه‌داشتن نمونه روی
// globalThis از ساخت دوباره جلوگیری می‌کنیم.
const globalForPrisma = globalThis;
const isDev = process.env.NODE_ENV === 'development';
const log = createLogger('prisma');

function createPrisma() {
  const client = new PrismaClient({
    // در توسعه، کوئری‌ها را به‌صورتِ رویداد می‌گیریم تا مدت‌زمانشان را لاگ کنیم.
    log: isDev
      ? [{ level: 'query', emit: 'event' }, { level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }]
      : ['error'],
  });

  if (isDev) {
    // هر کوئری با مدت‌زمانش لاگ می‌شود؛ کوئریِ کندتر از ۲۰۰ms هشدار (warn) می‌گیرد.
    client.$on('query', (e) => {
      const q = e.query.replace(/\s+/g, ' ').slice(0, 120);
      log[e.duration > 200 ? 'warn' : 'debug'](`${e.duration}ms  ${q}`);
    });
  }
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
