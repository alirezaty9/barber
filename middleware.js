import { NextResponse } from 'next/server';
import { verifyToken, SESSION_COOKIE } from '@/lib/jwt';

// محافظت از صفحات /admin/** — کاربر بدون سشن معتبر به صفحه‌ی ورود هدایت می‌شود.
// (مسیرهای API خودشان با guardAdmin محافظت می‌شوند.)
export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // صفحه‌ی ورود آزاد است
  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifyToken(token);

  if (!valid) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
