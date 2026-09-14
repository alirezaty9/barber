import { timingSafeEqual } from 'crypto';
import { loginSchema } from '@/lib/validation';
import { signAdminToken, setSessionCookie } from '@/lib/auth';
import { ok, parseBody, unauthorized, serverError, tooManyRequests } from '@/lib/api-helpers';
import { rateLimit, clientIp } from '@/lib/rate-limit';

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
  // محدودیتِ نرخ: حداکثر ۵ تلاش در هر ۶۰ ثانیه به‌ازای هر IP (ضدِ brute-force).
  const limit = rateLimit({ key: `login:${clientIp(request)}`, limit: 5, windowMs: 60_000 });
  if (!limit.ok) return tooManyRequests('تلاش‌های زیاد برای ورود. یک دقیقه صبر کنید.');

  const { data, response } = await parseBody(request, loginSchema);
  if (response) return response;

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return serverError('ADMIN_PASSWORD تنظیم نشده است.');

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
