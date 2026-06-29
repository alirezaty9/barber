import { PrismaClient } from '@prisma/client';

// در محیط توسعه، Next ماژول‌ها را hot-reload می‌کند و هر بار یک PrismaClient جدید
// ساخته می‌شود که باعث هشدار «too many connections» می‌شود. با نگه‌داشتن نمونه روی
// globalThis از ساخت دوباره جلوگیری می‌کنیم.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
