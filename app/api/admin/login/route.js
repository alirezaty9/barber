import { loginSchema } from '@/lib/validation';
import { signAdminToken, setSessionCookie } from '@/lib/auth';
import { ok, parseBody, unauthorized, serverError } from '@/lib/api-helpers';

// POST — ورود ادمین با رمز عبور (ADMIN_PASSWORD در .env).
export async function POST(request) {
  const { data, response } = await parseBody(request, loginSchema);
  if (response) return response;

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return serverError('ADMIN_PASSWORD تنظیم نشده است.');

  if (data.password !== expected) {
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
