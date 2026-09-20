import { prisma } from '@/lib/db';
import { statusUpdateSchema } from '@/lib/validation';
import { refundPayment } from '@/lib/zarinpal';
import { ok, guardAdmin, parseBody, notFound, badRequest, conflict, serverError, resolveCancelPatch } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('bookings:id');

// PATCH — تغییر وضعیت نوبت (فقط ادمین).
// قاعده: لغو توسط ادمین/آرایشگر ⇒ ۱۰۰٪ مبلغِ پرداخت‌شده مسترد می‌شود.
export async function PATCH(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const { data, response } = await parseBody(request, statusUpdateSchema);
  if (response) return response;

  try {
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return notFound('نوبت موردنظر یافت نشد.');

    // ── تسویه‌ی دستیِ پرداخت (خروج از حالتِ «در انتظار استرداد») ──
    // فقط برای رکوردی که واقعاً در آن حالت است، تا این مسیر تبدیل به راهی برای دست‌کاریِ
    // دلخواهِ وضعیتِ پرداختِ هر نوبتی نشود.
    if (data.paymentStatus) {
      if (existing.paymentStatus !== 'refundPending') {
        return badRequest('تغییرِ دستیِ وضعیتِ پرداخت فقط برای نوبت‌های «در انتظار استرداد» ممکن است.');
      }
      // ⚠️ `status` عمداً در این شاخه نادیده گرفته می‌شود. این مسیر یک «تسویه‌ی مالی» است،
      // نه یک گذارِ وضعیتِ نوبت؛ اگر status را هم می‌پذیرفت، یک درخواستِ ترکیبی می‌توانست
      // از کنارِ گاردهای پایین رد شود و نوبتِ لغوشده را دوباره «تایید» کند.
      const booking = await prisma.booking.update({
        where: { id },
        data: {
          paymentStatus: data.paymentStatus,
          // «مسترد شد» یعنی کلِ مبلغ برگشته؛ در حالتِ «پرداخت‌شده» بدهی‌ای ثبت نمی‌شود.
          refundAmount: data.paymentStatus === 'refunded' ? existing.amount : 0,
        },
        include: { service: true, service2: true, barber: true },
      });
      return ok(booking);
    }

    // ── ماشینِ حالت: کدام تغییرِ وضعیت مجاز است؟ (سمتِ سرور، نه فقط مخفی‌کردنِ دکمه) ──
    //
    // ۱) نوبتِ لغوشده دوباره «تایید» نمی‌شود. اگر می‌شد، یا با ایندکسِ یکتای اسلات برخورد
    //    می‌کرد و خطای ۵۰۰ می‌داد، یا رکوردی متناقض می‌ساخت که هم‌زمان «تایید شده» و
    //    «مسترد شده (توسط مدیریت)» بود. برای برگرداندنِ مشتری باید نوبتِ تازه ثبت شود.
    if (data.status === 'confirmed' && existing.status === 'cancelled') {
      return badRequest('نوبتِ لغوشده دوباره تأیید نمی‌شود؛ برای این مشتری نوبتِ جدید ثبت کنید.');
    }
    // ۲) تایید فقط برای نوبتی که پولش دستِ آرایشگاه است. قبلاً فقط حالتِ «ناموفق» بسته بود،
    //    پس یک رزروِ نیمه‌تمامِ پرداخت‌نشده (مشتری‌ای که وسطِ درگاه منصرف شده) با یک کلیک
    //    «تایید» می‌شد و خدمتِ رایگان می‌گرفت؛ و نوبتِ مستردشده هم دوباره قابلِ تایید بود.
    if (data.status === 'confirmed' && existing.paymentStatus !== 'paid') {
      return badRequest('این نوبت پرداختِ تأییدشده ندارد و قابلِ تأیید نیست.');
    }

    // اگر ادمین نوبت را لغو می‌کند و قبلاً لغو نشده، استرداد کامل اعمال شود.
    // ⏸️ تا وقتی کلیدِ استرداد خاموش است، resolveCancelPatch هیچ مبلغِ استردادی برنمی‌گرداند
    // و در نتیجه شرطِ زیر رد می‌شود؛ یعنی نه تماسی با زرین‌پال، نه برچسبِ «مسترد شده».
    let updateData;
    if (data.status === 'cancelled' && existing.status !== 'cancelled') {
      updateData = resolveCancelPatch(existing, 'admin');
      if (updateData.refundAmount > 0) {
        const refund = await refundPayment({
          amount: updateData.refundAmount,
          authority: existing.paymentAuthority,
          description: `استرداد کامل لغو نوبت ${existing.code} توسط مدیریت`,
        });
        // استردادِ ناموفق → «در انتظار استرداد» تا وضعیت واقعی منعکس شود.
        // ⚠️ مبلغِ استرداد هم صفر می‌شود: پولی برنگشته، پس ثبتِ عددِ مسترد یعنی دو جای
        // داشبورد همان مبلغ را هم‌زمان «برگشته» و «تسویه‌نشده» گزارش کنند.
        if (!refund.ok) {
          log.warn(`admin refund failed for ${existing.code}: ${refund.error || 'unknown'}`);
          updateData.paymentStatus = 'refundPending';
          updateData.refundAmount = 0;
        }
      }
    } else {
      updateData = { status: data.status };
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: { service: true, service2: true, barber: true },
    });
    return ok(booking);
  } catch (e) {
    if (e?.code === 'P2025') return notFound('نوبت موردنظر یافت نشد.');
    // P2002 = ایندکسِ یکتای اسلات؛ یعنی همان ساعت به نوبتِ فعالِ دیگری تعلق دارد.
    // بدونِ این ترجمه، ادمین فقط توستِ «خطای داخلی سرور» می‌دید و علت را نمی‌فهمید.
    if (e?.code === 'P2002') return conflict('این ساعت به نوبتِ دیگری تعلق دارد.');
    log.error('PATCH booking failed', e);
    return serverError();
  }
}

// DELETE — حذف دائمی نوبت (فقط ادمین).
export async function DELETE(request, { params }) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  try {
    await prisma.booking.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    if (e?.code === 'P2025') return notFound('نوبت موردنظر یافت نشد.');
    log.error('DELETE booking failed', e);
    return serverError();
  }
}
