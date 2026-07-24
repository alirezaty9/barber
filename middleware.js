import { NextResponse } from 'next/server';
import { verifyToken, SESSION_COOKIE } from '@/lib/jwt';

// متدهای «تغییردهنده» که باید در برابرِ CSRF محافظت شوند.
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// چکِ CSRF: اگر هدرِ Origin وجود دارد باید با هاستِ خودِ سایت یکی باشد. حمله‌ی CSRF کلاسیک
// یعنی صفحه‌ی مهاجم از دامنه‌ی دیگری درخواستِ تغییردهنده می‌فرستد؛ مرورگر Originِ آن دامنه را
// می‌فرستد و اینجا رد می‌شود. (کوکیِ سشن sameSite:lax است، این هم لایه‌ی دفاعیِ دوم.)
function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // بعضی کلاینت‌های غیرمرورگری Origin نمی‌فرستند → مسدود نمی‌کنیم.
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ── مسیرهای API: فقط چکِ CSRF روی درخواست‌های تغییردهنده ──
  if (pathname.startsWith('/api')) {
    if (MUTATING.has(request.method) && !isSameOrigin(request)) {
      return NextResponse.json({ error: 'مبدأ درخواست نامعتبر است.' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ── صفحاتِ /admin/**: نیازمندِ سشنِ معتبر ──
  // صفحه‌ی ورود آزاد است.
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
  // هم صفحاتِ ادمین (احراز هویت) و هم مسیرهای API (چکِ CSRF) پوشش داده می‌شوند.
  matcher: ['/admin/:path*', '/api/:path*'],
};
