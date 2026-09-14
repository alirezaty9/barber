import { prisma } from '@/lib/db';
import { lookupSchema } from '@/lib/validation';
import { ok, parseBody, serverError, tooManyRequests } from '@/lib/api-helpers';
import { rateLimit, clientIp } from '@/lib/rate-limit';

// POST — رهگیری نوبت توسط مشتری فقط با شماره موبایل (عمومی).
// چون یک شماره می‌تواند چند نوبت داشته باشد، فهرستی از نوبت‌ها برگردانده می‌شود.
export async function POST(request) {
  // ضدِ enumeration/harvestingِ PII: هم سقفِ IP و هم سقفِ per-phone تا کسی نتواند فضای
  // شماره‌ها را اسکن کند و برنامه‌ی حضورِ مشتری‌ها را برداشت کند.
  const ip = clientIp(request);
  if (!rateLimit({ key: `lookup-ip:${ip}`, limit: 10, windowMs: 60_000 }).ok) {
    return tooManyRequests('درخواست‌های زیاد. کمی بعد دوباره تلاش کنید.');
  }

  const { data, response } = await parseBody(request, lookupSchema);
  if (response) return response;

  if (!rateLimit({ key: `lookup-phone:${data.phone}`, limit: 5, windowMs: 60_000 }).ok) {
    return tooManyRequests('درخواست‌های زیاد برای این شماره. کمی بعد دوباره تلاش کنید.');
  }

  try {
    // نتیجه‌ی جست‌وجو یک «فهرست» است؛ فهرستِ خالی یعنی «نوبتی نبود» — این خطا نیست.
    // پس همیشه 200 با آرایه (حتی خالی) برمی‌گردانیم و نمایشِ حالتِ خالی به UI سپرده می‌شود.
    //
    // 🔒 فقط همان فیلدهایی که صفحه‌ی رهگیری واقعاً نمایش می‌دهد بیرون می‌روند — نه کلِ رکورد.
    //
    // چرا این مهم است؟ این مسیر عمومی است و فقط با شماره‌ی موبایل کار می‌کند. اگر کلِ رکورد
    // برگردد، این‌ها هم لو می‌روند: اثرِ انگشتِ (hash) کدِ تأییدِ لغو، زمانِ انقضا و تعدادِ
    // تلاش‌های آن، و شناسه‌های داخلیِ تراکنشِ پرداخت.
    //
    // خطرِ مشخص: کدِ تأیید فقط ۶ رقم است (۹۰۰٬۰۰۰ حالت). یک‌طرفه‌بودنِ hash وقتی محافظت
    // می‌کند که فضای حالت‌ها بزرگ باشد؛ اینجا مهاجم می‌تواند هر ۹۰۰٬۰۰۰ حالت را روی یک
    // لپ‌تاپ در کمتر از یک ثانیه hash کند و با مقداری که گرفته مقایسه کند. یعنی کدِ تأیید
    // را بدونِ دیدنِ پیامک به دست می‌آورد و نوبتِ مشتریِ دیگری را لغو می‌کند — و سقفِ ۵
    // تلاش هم جلویش را نمی‌گیرد، چون اصلاً «تلاش» نمی‌کند و از اول کدِ درست را دارد.
    //
    // 📌 قاعده‌ی کلی: هر مسیرِ عمومی باید فیلدهایش را صریح انتخاب کند (select)، نه اینکه
    //    کلِ رکورد را بفرستد و به «UI که نشانش نمی‌دهد» تکیه کند.
    const bookings = await prisma.booking.findMany({
      where: { customerPhone: data.phone },
      select: {
        code: true,
        status: true,
        date: true,
        timeSlot: true,
        customerName: true,
        refundAmount: true,
        // برچسبِ خدمات: اسنپ‌شاتِ جدید، و دو رابطه برای سازگاری با رکوردهای قدیمی‌تر.
        servicesLabel: true,
        service: { select: { name: true } },
        service2: { select: { name: true } },
      },
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
    });
    return ok(bookings);
  } catch {
    return serverError();
  }
}
