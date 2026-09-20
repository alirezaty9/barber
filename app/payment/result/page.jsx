import Link from 'next/link';
import { Check, X, AlertTriangle, Search, Home, Phone } from 'lucide-react';
import { prisma } from '@/lib/db';
import { formatPrice, toPersianDigits, formatJalaliDate } from '@/lib/persian';
import { servicesLabelOf } from '@/lib/serializers';
import { REFUND_POLICY_NOTE } from '@/lib/features';
import { SHOP_PHONE_LINK, SHOP_PHONE_DISPLAY } from '@/lib/shop';

export const dynamic = 'force-dynamic';

// حالت‌های نتیجه‌ی پرداخت. «needs_review» و «slot_lost» حالت‌هایی هستند که در آن‌ها پول
// واقعاً از حساب مشتری کسر شده ولی نوبت قطعی نشده — قبلاً همین دو حالت هم پیامِ نادرستِ
// «مبلغی از حساب شما کسر نشده است» می‌گرفتند و مشتری بی‌خبر می‌ماند.
const OUTCOMES = {
  success: {
    tone: 'ok',
    title: 'پرداخت با موفقیت انجام شد!',
    text: 'نوبت شما قطعی شد. کد رهگیری را نگه دارید تا هر وقت خواستید وضعیت نوبتتان را ببینید.',
  },
  slot_lost: {
    tone: 'warn',
    title: 'پرداخت انجام شد، ولی این ساعت پر شد',
    text: 'مبلغ از حساب شما کسر شده است اما در همان لحظه این ساعت به نوبتِ دیگری رسید. پول شما محفوظ است؛ لطفاً با آرایشگاه تماس بگیرید تا ساعت دیگری ثبت شود یا مبلغ بازگردانده شود.',
  },
  needs_review: {
    tone: 'warn',
    title: 'پرداخت انجام شد، ولی ثبت نوبت کامل نشد',
    text: 'مبلغ از حساب شما کسر شده اما ثبت نهایی نوبت با مشکل روبه‌رو شد. پول شما محفوظ است؛ لطفاً با کد رهگیری با آرایشگاه تماس بگیرید تا تعیین تکلیف شود.',
  },
  failed: {
    tone: 'bad',
    title: 'پرداخت ناموفق بود',
    text: 'پرداخت شما کامل نشد یا لغو گردید. مبلغی از حساب شما کسر نشده است. می‌توانید دوباره تلاش کنید.',
  },
};

const TONES = {
  ok: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500',
  warn: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
  bad: 'bg-red-500/10 border-red-500/30 text-red-500',
};

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

  // حالت از روی پارامترِ آدرس تعیین می‌شود، ولی «موفق» فقط وقتی پذیرفته می‌شود که وضعیتِ
  // واقعیِ رکورد هم پرداخت‌شده باشد — تا با دست‌کاری آدرس نشود پیامِ موفقیت ساخت.
  // 🔴 علاوه بر «پرداخت‌شده»، نوبت نباید لغو شده باشد.
  // بدونِ قیدِ دوم این حالت رخ می‌داد: نوبتِ پرداخت‌شده‌ای که آرایشگاه لغوش کرده (و چون
  // استرداد خاموش است وضعیتِ پرداختش همان «پرداخت‌شده» مانده)، با بازکردنِ دوباره‌ی همین
  // صفحه پیامِ «نوبت شما قطعی شد» می‌گرفت و مشتری سرِ ساعت می‌آمد.
  const paidAndAlive = booking?.paymentStatus === 'paid' && booking?.status !== 'cancelled';
  // بدونِ رکورد اصلاً ادعایی دربارهٔ پول نمی‌کنیم؛ با رکوردِ لغوشده یا پرداخت‌نشده، حالتِ
  // «نیازِ پیگیری» صادقانه‌تر از «موفق» است.
  const key = status === 'success' && !paidAndAlive ? (booking ? 'needs_review' : 'failed') : status;
  const outcome = OUTCOMES[key] || OUTCOMES.failed;
  const success = outcome === OUTCOMES.success;
  const needsContact = outcome.tone === 'warn';
  const services = booking ? servicesLabelOf(booking) : '';

  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg bg-zinc-950/60 border border-zinc-900 rounded-3xl p-8 md:p-10 text-center">
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6 border-2 ${TONES[outcome.tone]}`}
        >
          {success ? <Check className="w-8 h-8" /> : needsContact ? <AlertTriangle className="w-8 h-8" /> : <X className="w-8 h-8" />}
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-2">{outcome.title}</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">{outcome.text}</p>

        {booking && (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 mb-8 text-xs text-zinc-300 text-right space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">کد رهگیری نوبت:</span>
              <span className="font-mono font-bold text-amber-500 text-sm" dir="ltr">{booking.code}</span>
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
            {booking.paymentRefId && (
              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                <span className="text-zinc-500">کد پیگیری پرداخت:</span>
                {/* شناسه‌ی پرداخت با ارقامِ لاتین می‌ماند تا قابلِ کپی و جست‌وجو در پنلِ بانک باشد. */}
                <span className="font-mono text-zinc-200" dir="ltr">{booking.paymentRefId}</span>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-amber-400/90 leading-relaxed mb-8">
            توجه: {REFUND_POLICY_NOTE}
          </div>
        )}

        {needsContact && (
          <a
            href={`tel:${SHOP_PHONE_LINK}`}
            className="flex items-center justify-center gap-2 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[12px] text-amber-300 font-bold mb-8"
          >
            <Phone className="w-4 h-4" />
            <span>تماس با آرایشگاه: {SHOP_PHONE_DISPLAY}</span>
          </a>
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
