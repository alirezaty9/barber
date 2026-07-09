import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPayment } from '@/lib/zarinpal';

// GET — callback زرین‌پال. کاربر پس از پرداخت با ?Authority=&Status= به اینجا بازمی‌گردد.
// نتیجه بررسی و رزرو به‌روزرسانی می‌شود، سپس کاربر به صفحه‌ی نتیجه ری‌دایرکت می‌شود.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const authority = searchParams.get('Authority') || searchParams.get('authority');
  const status = searchParams.get('Status') || searchParams.get('status');

  const resultUrl = (params) => new URL(`/payment/result?${params}`, origin);

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

  // تأیید نهایی با زرین‌پال.
  const verify = await verifyPayment({ amount: booking.amount, authority });
  if (verify.ok) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'paid', paymentRefId: verify.refId || null },
    });
    return NextResponse.redirect(resultUrl(`status=success&code=${booking.code}`));
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentStatus: 'failed', status: 'cancelled' },
  });
  return NextResponse.redirect(resultUrl(`status=failed&code=${booking.code}`));
}
