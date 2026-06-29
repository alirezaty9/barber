// منطق امضا/راستی‌آزمایی JWT — بدون وابستگی به next/headers تا روی edge (middleware) هم کار کند.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'admin_session';
export const MAX_AGE_SEC = 60 * 60 * 24 * 7; // ۷ روز

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET تعریف نشده است (فایل .env را بررسی کن).');
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload?.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}
