import Link from 'next/link';
import { Check, X, Search, Home } from 'lucide-react';
import { prisma } from '@/lib/db';
import { formatPrice, toPersianDigits, formatJalaliDate } from '@/lib/persian';

export const dynamic = 'force-dynamic';

// صفحه‌ی نتیجه‌ی پرداخت — کاربر پس از بازگشت از درگاه به اینجا هدایت می‌شود.
export default async function PaymentResultPage({ searchParams }) {
  const sp = await searchParams;
  const status = sp?.status;
  const code = sp?.code;

  const booking = code
    ? await prisma.booking.findUnique({
        where: { code },
        include: { service: true, service2: true, barber: true },
      })
    : null;

  const success = status === 'success' && booking?.paymentStatus === 'paid';
  const services = booking
    ? [booking.service?.name, booking.service2?.name].filter(Boolean).join(' + ')
    : '';

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg bg-zinc-950/60 border border-zinc-900 rounded-3xl p-8 md:p-10 text-center">
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 border-2 ${
            success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}
        >
          {success ? <Check className="w-8 h-8" /> : <X className="w-8 h-8" />}
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-2">
          {success ? 'پرداخت با موفقیت انجام شد!' : 'پرداخت ناموفق بود'}
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          {success
            ? 'نوبت شما ثبت و پرداخت شد. پس از تأیید نهایی آرایشگر، نوبت شما قطعی می‌شود.'
            : 'متأسفانه پرداخت شما کامل نشد یا لغو گردید. مبلغی از حساب شما کسر نشده است. می‌توانید دوباره تلاش کنید.'}
        </p>

        {booking && (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 mb-8 text-xs text-zinc-300 text-right space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">کد رهگیری نوبت:</span>
              <span className="font-mono font-bold text-amber-500 text-sm">{booking.code}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">مشتری:</span>
              <span className="font-bold text-white">{booking.customerName}</span>
            </div>
            {services && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">خدمت:</span>
                <span className="font-bold text-white">{services}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">زمان:</span>
              <span className="font-bold text-white">
                {formatJalaliDate(booking.date, { weekday: 'long', day: 'numeric', month: 'long' })} - ساعت{' '}
                {toPersianDigits(booking.timeSlot)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">مبلغ:</span>
              <span className="font-extrabold text-amber-500">{formatPrice(booking.amount)}</span>
            </div>
            {success && booking.paymentRefId && (
              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                <span className="text-zinc-500">کد پیگیری پرداخت:</span>
                <span className="font-mono text-zinc-200">{toPersianDigits(booking.paymentRefId)}</span>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-amber-400/90 leading-relaxed mb-8">
            توجه: در صورت لغو نوبت، ۵۰٪ مبلغ پرداختی به شما بازگردانده می‌شود.
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/track"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>رهگیری نوبت</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-sm font-medium rounded-xl transition-colors"
          >
            <Home className="w-4 h-4 text-amber-500" />
            <span>بازگشت به صفحه اصلی</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
