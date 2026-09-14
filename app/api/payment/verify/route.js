import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPayment } from '@/lib/zarinpal';
import { resolveRequestBaseUrl } from '@/lib/site';
import { createLogger } from '@/lib/logger';

const log = createLogger('payment:verify');

// GET — callback زرین‌پال. کاربر پس از پرداخت با ?Authority=&Status= به اینجا بازمی‌گردد.
// نتیجه بررسی و رزرو به‌روزرسانی می‌شود، سپس کاربر به صفحه‌ی نتیجه ری‌دایرکت می‌شود.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const authority = searchParams.get('Authority') || searchParams.get('authority');
  const status = searchParams.get('Status') || searchParams.get('status');

  // 🔴 این ری‌دایرکت عمداً «نسبی» است و هیچ دامنه‌ای داخلش نیست.
  //
  // تاریخچه‌ی این تصمیم: دو بار تلاش شد آدرسِ مطلق از روی متغیرِ محیطی یا هدرهای درخواست
  // ساخته شود و هر دو بار روی سرور به `https://0.0.0.0:3000` رسید — یعنی برنامه به‌جای
  // دامنه‌ی عمومی، آدرسِ داخلیِ خودش را می‌دید. ریشه‌ی مشکل این بود که اصلاً «برنامه باید
  // نامِ عمومیِ خودش را بداند» فرضِ شکننده‌ای است: پشتِ پراکسی ممکن است ندانَد.
  //
  // راهِ قطعی: ندانستنش را بی‌اهمیت کنیم. طبقِ استانداردِ HTTP، مقدارِ Location می‌تواند
  // مسیرِ نسبی باشد و خودِ مرورگر آن را نسبت به آدرسی که در آن است حل می‌کند — و مرورگرِ
  // مشتری دقیقاً روی دامنه‌ی عمومیِ درست است. پس دیگر هیچ حدسی در کار نیست.
  const resultUrl = (params) =>
    new NextResponse(null, {
      status: 303, // «کارت انجام شد، حالا این صفحه را ببین» — معنای درستِ بعد از پردازش
      headers: { Location: `/payment/result?${params}` },
    });

  // ⚠️ تشخیصِ موقت — بعد از تأییدِ درست‌کارکردنِ پرداخت روی سرور حذف شود.
  // عمداً سطحِ warn است، چون سطحِ پیش‌فرضِ لاگ روی سرور warn است و پایین‌تر از آن دیده نمی‌شود.
  // هدفش این است که اگر باز هم آدرسِ بازگشت ناجور بود، به‌جای حدس‌زدن ببینیم سرور واقعاً
  // چه هدرهایی می‌گیرد و متغیرِ محیطی موقعِ بیلد چه مقداری گرفته است.
  log.warn(
    `[تشخیصِ موقت] host=${request.headers.get('host')} | x-forwarded-host=${request.headers.get('x-forwarded-host')} `
    + `| x-forwarded-proto=${request.headers.get('x-forwarded-proto')} | NEXT_PUBLIC_BASE_URL=${process.env.NEXT_PUBLIC_BASE_URL} `
    + `| base=${resolveRequestBaseUrl(request)}`,
  );

  // تمامِ منطق داخلِ try است تا یک خطای DB/شبکه هم به صفحه‌ی نتیجه ری‌دایرکت شود، نه ۵۰۰ خام.
  try {
    if (!authority) {
      return resultUrl('status=failed');
    }

    const booking = await prisma.booking.findFirst({ where: { paymentAuthority: authority } });
    if (!booking) {
      return resultUrl('status=failed');
    }

    // اگر قبلاً پرداخت‌شده بود (رفرش صفحه)، مستقیم موفق برگرد.
    if (booking.paymentStatus === 'paid') {
      return resultUrl(`status=success&code=${booking.code}`);
    }

    // کاربر پرداخت را لغو کرد یا ناموفق بود.
    if (status !== 'OK') {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'failed', status: 'cancelled' },
      });
      return resultUrl(`status=failed&code=${booking.code}`);
    }

    // تأیید نهایی با زرین‌پال. توجه: مبلغِ رزرو (booking.amount) را به verify می‌فرستیم و
    // خودِ زرین‌پال آن را با مبلغِ واقعیِ پرداخت‌شده تطبیق می‌دهد؛ اگر نخواند کدِ ≠ ۱۰۰ برمی‌گرداند.
    // پس رسیدنِ کدِ ۱۰۰/۱۰۱ یعنی مبلغ سمتِ زرین‌پال درست بوده. پاسخِ verifyِ زرین‌پال معمولاً
    // خودِ amount را برنمی‌گرداند (paidAmount=null)؛ در آن حالت به تأییدِ خودِ زرین‌پال تکیه می‌کنیم
    // و فقط وقتی رد می‌کنیم که درگاه «صریحاً» مبلغی متفاوت با رزرو برگردانده باشد (ضدِ دستکاری).
    const verify = await verifyPayment({ amount: booking.amount, authority });
    const amountMismatch = verify.paidAmount != null && verify.paidAmount !== booking.amount;
    if (verify.ok && !amountMismatch) {
      // پرداخت موفق ⇒ نوبت خودکار «تایید» می‌شود (دیگر نیازی به تاییدِ دستیِ آرایشگر نیست).
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'paid', status: 'confirmed', paymentRefId: verify.refId || null },
      });
      return resultUrl(`status=success&code=${booking.code}`);
    }

    if (verify.ok && amountMismatch) {
      log.error(`amount mismatch for ${booking.code}: paid=${verify.paidAmount} expected=${booking.amount}`);
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'failed', status: 'cancelled' },
    });
    return resultUrl(`status=failed&code=${booking.code}`);
  } catch (e) {
    log.error('verify failed', e);
    return resultUrl('status=failed');
  }
}
