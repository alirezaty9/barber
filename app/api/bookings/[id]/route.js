import { prisma } from '@/lib/db';
import { statusUpdateSchema } from '@/lib/validation';
import { refundPayment } from '@/lib/zarinpal';
import { ok, guardAdmin, parseBody, notFound, badRequest, conflict, serverError, resolveCancelPatch, refundShareFor } from '@/lib/api-helpers';
import { createLogger } from '@/lib/logger';

const log = createLogger('bookings:id');

// PATCH — تغییر وضعیت نوبت (فقط ادمین).
// قاعده (فقط وقتی کلیدِ REFUNDS_ENABLED روشن باشد): لغو توسط مدیریت ⇒ ۱۰۰٪ مسترد می‌شود.
// ⏸️ با کلیدِ خاموشِ فعلی هیچ استردادی انجام نمی‌شود (جزئیاتش در خودِ شاخه‌ی لغو پایین).
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
      // دو حالتِ مجاز، و هر دو فقط روی نوبتِ **لغوشده**:
      //   • «در انتظار استرداد» — سیستم خودش ساخته (اسلات رفت / مبلغ نخواند / استرداد شکست خورد)
      //   • «پرداخت‌شده»       — لغوِ عادی با استردادِ خاموش؛ پول هنوز دستِ آرایشگاه است.
      //
      // 🔴 حالتِ دوم تا امروز بن‌بست بود: با کلیدِ خاموشِ استرداد، **هر** لغوِ یک نوبتِ
      // پرداخت‌شده همین وضعیت را می‌سازد. آرایشگر پول را کارت‌به‌کارت برمی‌گرداند و هیچ
      // راهی برای ثبتش نداشت، پس آن مبلغ تا ابد جزوِ «درآمد» می‌ماند.
      const settleable =
        existing.status === 'cancelled' &&
        ['refundPending', 'paid'].includes(existing.paymentStatus);
      if (!settleable) {
        return badRequest('تسویه‌ی دستیِ پرداخت فقط برای نوبتِ لغوشده‌ای ممکن است که پولش هنوز تعیین‌تکلیف نشده.');
      }
      // ⚠️ `status` عمداً در این شاخه نادیده گرفته می‌شود. این مسیر یک «تسویه‌ی مالی» است،
      // نه یک گذارِ وضعیتِ نوبت؛ اگر status را هم می‌پذیرفت، یک درخواستِ ترکیبی می‌توانست
      // از کنارِ گاردهای پایین رد شود و نوبتِ لغوشده را دوباره «تایید» کند.
      const booking = await prisma.booking.update({
        where: { id },
        data: {
          paymentStatus: data.paymentStatus,
          // مبلغِ مسترد از روی «چه کسی لغو کرده» ساخته می‌شود (۵۰٪ برای لغوِ مشتری)، نه
          // همیشه کلِ مبلغ. در حالتِ «توافق شد» هیچ بدهی‌ای ثبت نمی‌شود.
          refundAmount: data.paymentStatus === 'refunded' ? refundShareFor(existing) : 0,
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
    //    قید عمداً روی **هر** وضعیتِ مقصد است، نه فقط «تایید». اگر فقط «تایید» بسته بود،
    //    دو درخواستِ پشتِ‌سرِهم (اول «در انتظار»، بعد «تایید») از کنارش رد می‌شد؛ چون در
    //    گامِ دوم دیگر وضعیتِ فعلی «لغوشده» نبود. «لغو» حالتِ پایانی است و از آن خروجی نیست.
    if (existing.status === 'cancelled' && data.status !== 'cancelled') {
      return badRequest('نوبتِ لغوشده دوباره فعال نمی‌شود؛ برای این مشتری نوبتِ جدید ثبت کنید.');
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
