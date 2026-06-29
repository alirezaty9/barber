import { cookies } from 'next/headers';
import { signAdminToken, verifyToken, SESSION_COOKIE, MAX_AGE_SEC } from './jwt';

// re-export برای استفاده‌ی Route Handlerها
export { signAdminToken, verifyToken, SESSION_COOKIE };

/** ست‌کردن کوکی httpOnly سشن (در Route Handler). */
export async function setSessionCookie(token) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
  });
}

/** حذف کوکی سشن (خروج). */
export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** آیا درخواست فعلی از سمت ادمینِ احرازشده است؟ */
export async function isAuthenticated() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return Boolean(await verifyToken(token));
}
