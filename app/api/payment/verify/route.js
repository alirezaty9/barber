import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPayment } from '@/lib/zarinpal';
import { createLogger } from '@/lib/logger';

const log = createLogger('payment:verify');

// GET — callback زرین‌پال. کاربر پس از پرداخت با ?Authority=&Status= به اینجا بازمی‌گردد.
// نتیجه بررسی و رزرو به‌روزرسانی می‌شود، سپس کاربر به صفحه‌ی نتیجه ری‌دایرکت می‌شود.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const authority = searchParams.get('Authority') || searchParams.get('authority');
  const status = searchParams.get('Status') || searchParams.get('status');

  const resultUrl = (params) => new URL(`/payment/result?${params}`, origin);

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

    // تأیید نهایی با زرین‌پال — و تطبیقِ مبلغِ واقعیِ پرداخت‌شده با مبلغِ رزرو (ضدِ دستکاری).
    // fail-closed: اگر درگاه مبلغ را برنگرداند (null) پرداخت را «نامعتبر» می‌گیریم، نه معتبر.
    const verify = await verifyPayment({ amount: booking.amount, authority });
    const amountOk = verify.paidAmount != null && verify.paidAmount === booking.amount;
    if (verify.ok && amountOk) {
      // پرداخت موفق ⇒ نوبت خودکار «تایید» می‌شود (دیگر نیازی به تاییدِ دستیِ آرایشگر نیست).
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'paid', status: 'confirmed', paymentRefId: verify.refId || null },
      });
      return NextResponse.redirect(resultUrl(`status=success&code=${booking.code}`));
    }

    if (verify.ok && !amountOk) {
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
