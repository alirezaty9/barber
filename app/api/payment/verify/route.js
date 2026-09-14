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

  // 🔴 قبلاً اینجا origin مستقیم از آدرسِ درخواست برداشته می‌شد و NEXT_PUBLIC_BASE_URL را
  // نادیده می‌گرفت — برخلافِ مسیرِ شروعِ پرداخت که از آن متغیر استفاده می‌کرد. یعنی دو نیمه‌ی
  // یک فرایند، دو آدرسِ متفاوت می‌ساختند. حالا هر دو از یک منبع می‌خوانند.
  const base = resolveRequestBaseUrl(request);
  const resultUrl = (params) => new URL(`/payment/result?${params}`, base);

  // تمامِ منطق داخلِ try است تا یک خطای DB/شبکه هم به صفحه‌ی نتیجه ری‌دایرکت شود، نه ۵۰۰ خام.
  try {
    if (!authority) {
      return NextResponse.redirect(resultUrl('status=failed'));
    }

    const booking = await prisma.booking.findFirst({ where: { paymentAuthority: authority } });
    if (!booking) {
      return NextResponse.redirect(resultUrl('status=failed'));
    }

    // اگر قبلاً پرداخت‌شده بود (رفرش صفحه)، مستقیم موفق برگرد.
    if (booking.paymentStatus === 'paid') {
      return NextResponse.redirect(resultUrl(`status=success&code=${booking.code}`));
    }

    // کاربر پرداخت را لغو کرد یا ناموفق بود.
    if (status !== 'OK') {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'failed', status: 'cancelled' },
      });
      return NextResponse.redirect(resultUrl(`status=failed&code=${booking.code}`));
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
      return NextResponse.redirect(resultUrl(`status=success&code=${booking.code}`));
    }

    if (verify.ok && amountMismatch) {
      log.error(`amount mismatch for ${booking.code}: paid=${verify.paidAmount} expected=${booking.amount}`);
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'failed', status: 'cancelled' },
    });
    return NextResponse.redirect(resultUrl(`status=failed&code=${booking.code}`));
  } catch (e) {
    log.error('verify failed', e);
    return NextResponse.redirect(resultUrl('status=failed'));
  }
}
