import { timingSafeEqual } from 'crypto';
import { loginSchema } from '@/lib/validation';
import { signAdminToken, setSessionCookie } from '@/lib/auth';
import { ok, parseBody, unauthorized, serverError, tooManyRequests } from '@/lib/api-helpers';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin:login');

// مقایسه‌ی رشته‌ها به‌صورتِ constant-time تا از timing attack جلوگیری شود.
function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ⚠️ به‌درخواستِ صریحِ صاحبِ پروژه، سخت‌گیریِ «حداقل قدرتِ رمز» برداشته شد تا رمزِ دلخواه
// (از جمله admin) پذیرفته شود. توصیه‌ی امنیتی: هر وقت خواستی، فقط کافی است مقدارِ
// ADMIN_PASSWORD را در .env / پنلِ هاست به یک رمزِ قوی عوض کنی — هیچ تغییرِ کدی لازم نیست.

// POST — ورود ادمین با رمز عبور (ADMIN_PASSWORD در .env).
export async function POST(request) {
  // ── سدِّ brute-force، دو لایه‌ی مستقل ──
  // لایه‌ی ۱: ۵ تلاش در هر ۶۰ ثانیه به‌ازای هر IP.
  const limit = rateLimit({ key: `login:${clientIp(request)}`, limit: 5, windowMs: 60_000 });
  if (!limit.ok) return tooManyRequests('تلاش‌های زیاد برای ورود. یک دقیقه صبر کنید.');

  // لایه‌ی ۲ (سقفِ مطلق): ۳۰ تلاش در هر ۱۰ دقیقه برای کلِ سایت، مستقل از IP.
  // چرا لازم است؟ کلیدِ لایه‌ی ۱ از هدرهای درخواست ساخته می‌شود؛ اگر پراکسیِ هاست آن هدر را
  // بازنویسی نکند، مهاجم با هر درخواست یک IPِ ساختگی می‌فرستد و یک سطلِ تازه می‌گیرد — یعنی
  // لایه‌ی اول عملاً بی‌اثر می‌شود. این لایه به هیچ هدری وابسته نیست، پس دور زدنش ممکن نیست.
  const globalLimit = rateLimit({ key: 'login:global', limit: 30, windowMs: 10 * 60_000 });
  if (!globalLimit.ok) return tooManyRequests('تلاش‌های زیاد برای ورود. چند دقیقه بعد تلاش کنید.');

  const { data, response } = await parseBody(request, loginSchema);
  if (response) return response;

  const expected = process.env.ADMIN_PASSWORD;
  // پیامِ عمومی به کلاینت، علتِ واقعی فقط در لاگِ سرور — تا به یک غریبه گفته نشود که
  // پیکربندیِ سرور ناقص است (سرنخِ رایگان برای کسی که دنبالِ نقطه‌ی ضعف می‌گردد).
  if (!expected) {
    log.error('ADMIN_PASSWORD تنظیم نشده است؛ ورود ممکن نیست.');
    return serverError();
  }

  if (!safeEqual(data.password, expected)) {
    return unauthorized();
  }

  try {
    const token = await signAdminToken();
    await setSessionCookie(token);
    return ok({ success: true });
  } catch {
    return serverError();
  }
}
