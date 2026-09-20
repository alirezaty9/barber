import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPayment } from '@/lib/zarinpal';
import { PENDING_HOLD_MS } from '@/lib/constants';
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

  // آیا زرین‌پال پرداخت را تأیید کرده؟ اگر بله، دیگر حق نداریم به مشتری بگوییم «مبلغی کسر
  // نشد» — حتی اگر ثبتِ نوبت شکست بخورد. این پرچم همان تفکیک را ممکن می‌کند.
  let paymentTaken = false;
  // بیرون از try نگه داشته می‌شود تا اگر خطایی افتاد، بتوانیم در لاگ و در آدرسِ بازگشت
  // بگوییم «کدامِ نوبت» — وگرنه تنها ردِّ پولِ گرفته‌شده گم می‌شود.
  let booking = null;

  // تمامِ منطق داخلِ try است تا یک خطای DB/شبکه هم به صفحه‌ی نتیجه ری‌دایرکت شود، نه ۵۰۰ خام.
  try {
    if (!authority) {
      return resultUrl('status=failed');
    }

    booking = await prisma.booking.findFirst({ where: { paymentAuthority: authority } });
    if (!booking) {
      return resultUrl('status=failed');
    }

    // اگر قبلاً پرداخت‌شده بود (رفرش صفحه)، مستقیم موفق برگرد — مگر اینکه نوبت در این
    // فاصله لغو شده باشد (مثلاً آرایشگاه لغوش کرده و چون استرداد خاموش است وضعیتِ پرداخت
    // همان «پرداخت‌شده» مانده). در آن حالت «موفق» دروغ است.
    if (booking.paymentStatus === 'paid') {
      const outcome = booking.status === 'cancelled' ? 'needs_review' : 'success';
      return resultUrl(`status=${outcome}&code=${booking.code}`);
    }

    // 🔴 قفلِ ضدِ replay — این مسیر یک GETِ عمومی و بی‌نهایت تکرارشدنی است.
    //
    // اگر روی این رزرو قبلاً یک تصمیمِ مالی ثبت شده باشد (مسترد شد، در انتظار استرداد، یا
    // پرداخت ناموفق بود)، بازکردنِ دوباره‌ی همین آدرس نباید چیزی را عوض کند. بدونِ این قید
    // این اتفاق می‌افتاد: نوبتی که لغو و پولش مسترد شده بود، با یک بار بازکردنِ لینکِ بازگشت
    // دوباره «تایید شده و پرداخت‌شده» می‌شد — چون درگاه برای تراکنشِ تأییدشده کدِ «قبلاً
    // تأیید شده» می‌دهد که ما آن را هم موفق می‌شماریم. یعنی هم پول برگشته بود، هم نوبت داده می‌شد.
    // ⚠️ فهرست عمداً صریح است و «هر چیزی جز unpaid» نیست.
    // حالتِ `failed` یک تصمیمِ مالی نیست — یعنی «هنوز پولی رد و بدل نشده». اگر آن هم اینجا
    // بسته می‌شد، دو خرابی داشت: (۱) مشتری‌ای که در درگاه انصراف داده و دوباره لینک را باز
    // می‌کند، پیامِ نادرستِ «مبلغ از حساب شما کسر شده» می‌گرفت؛ (۲) اگر پرداختِ طولانیِ
    // مشتری بعد از پایانِ نگه‌داشت جارو شده باشد، پرداختِ **موفقش** اصلاً تأیید نمی‌شد و
    // پول بی‌هیچ ردی می‌ماند. این دو حالت باید به منطقِ پایین برسند، نه به این قفل.
    if (['paid', 'refunded', 'refundPending'].includes(booking.paymentStatus)) {
      log.warn(`verify replay ignored for ${booking.code} (paymentStatus=${booking.paymentStatus})`);
      return resultUrl(`status=needs_review&code=${booking.code}`);
    }

    // کاربر پرداخت را لغو کرد یا ناموفق بود.
    // ⚠️ فقط رزروی که هنوز در حالتِ «منتظرِ پرداخت» است باطل می‌شود. این مسیر عمومی است
    // (بانک باید بتواند صدایش بزند) پس بدونِ این قید، هر کسی که یک Authority را بداند
    // می‌توانست با Status=NOK نوبتِ دیگری را باطل کند.
    if (status !== 'OK') {
      if (booking.status === 'pending' && booking.paymentStatus === 'unpaid') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: 'failed', status: 'cancelled' },
        });
      }
      return resultUrl(`status=failed&code=${booking.code}`);
    }

    // تأیید نهایی با زرین‌پال. توجه: مبلغِ رزرو (booking.amount) را به verify می‌فرستیم و
    // خودِ زرین‌پال آن را با مبلغِ واقعیِ پرداخت‌شده تطبیق می‌دهد؛ اگر نخواند کدِ ≠ ۱۰۰ برمی‌گرداند.
    // پس رسیدنِ کدِ ۱۰۰/۱۰۱ یعنی مبلغ سمتِ زرین‌پال درست بوده. پاسخِ verifyِ زرین‌پال معمولاً
    // خودِ amount را برنمی‌گرداند (paidAmount=null)؛ در آن حالت به تأییدِ خودِ زرین‌پال تکیه می‌کنیم
    // و فقط وقتی رد می‌کنیم که درگاه «صریحاً» مبلغی متفاوت با رزرو برگردانده باشد (ضدِ دستکاری).
    const verify = await verifyPayment({ amount: booking.amount, authority });
    // مقایسه‌ی مبلغ نسبت به واحد بردبار است: درخواست با واحدِ «تومان» فرستاده می‌شود ولی
    // بعضی پاسخ‌های درگاه مبلغ را به «ریال» (ده برابر) برمی‌گردانند. اگر این را تفاوت حساب
    // کنیم، یک پرداختِ کاملاً موفق را «مغایرتِ مبلغ» می‌بینیم و نوبت را لغو می‌کنیم.
    const paidAmount = verify.paidAmount;
    const amountMismatch =
      paidAmount != null && paidAmount !== booking.amount && paidAmount !== booking.amount * 10;

    if (verify.ok) paymentTaken = true;

    if (verify.ok && !amountMismatch) {
      // 🔴 پول گرفته شده. قبل از «تایید»، مطمئن شو اسلات هنوز مالِ همین رزرو است.
      // سناریوی واقعی: پرداختِ مشتری طول کشیده، نگه‌داشتِ اسلات تمام شده و ساعت به نفرِ
      // دیگری رسیده. رفتارِ قبلی: خطای ایندکسِ یکتا به catch می‌افتاد و به مشتری صفحه‌ی
      // «پرداخت ناموفق — مبلغی کسر نشد» نشان داده می‌شد، در حالی که پولش رفته بود.
      // (اگر آرایشگرِ رزرو به هر دلیلی خالی باشد، این چک معنا ندارد و رد می‌شود؛ وگرنه شرطِ
      // «آرایشگرِ خالی» به رکوردهای بی‌ربطِ دیگری هم می‌خورد.)
      //
      // ⚠️ «رزروِ فعالِ دیگر» باید دقیقاً همان تعریفی باشد که محاسبه‌ی موجودی به کار می‌برد،
      // وگرنه این چک سخت‌گیرتر از واقعیت می‌شود: رزروِ پرداخت‌نشده‌ای که مهلتِ نگه‌داشتش
      // تمام شده، اسلات را اشغال نمی‌کند و نباید مشتریِ پول‌داده را بیرون بیندازد. بدونِ این
      // قید این حالت رخ می‌داد: مشتری B اسلات را می‌گرفت و پرداخت نمی‌کرد، مشتری A که پول
      // داده بود رد می‌شد، و در نهایت اسلات **خالی** می‌ماند و A هم نوبت نداشت.
      // 🔴 نوبتی که **عمداً** لغو شده نباید با بازگشتِ پرداخت زنده شود.
      // تفکیک از روی cancelledBy انجام می‌شود: وقتی آرایشگاه یا مشتری لغو می‌کند این ستون
      // پر است؛ ولی وقتی رزرو صرفاً به‌خاطرِ پایانِ مهلتِ نگه‌داشت جارو شده، خالی است.
      // حالتِ دوم باید قابلِ احیا باشد (مشتری پولش را داده و اسلات هم آزاد است)، حالتِ اول نه —
      // وگرنه نوبتی که آرایشگر عمداً لغو کرده بی‌خبر برمی‌گشت و مشتری سرِ ساعت می‌آمد.
      const deliberatelyCancelled = booking.status === 'cancelled' && Boolean(booking.cancelledBy);

      const staleCutoff = new Date(Date.now() - PENDING_HOLD_MS);
      const conflict = booking.barberId
        ? await prisma.booking.findFirst({
            where: {
              barberId: booking.barberId,
              date: booking.date,
              timeSlot: booking.timeSlot,
              status: { not: 'cancelled' },
              id: { not: booking.id },
              // رزروِ پرداخت‌نشده‌ی کهنه «فعال» شمرده نمی‌شود.
              // ⚠️ شکلِ `NOT: { AND: [...] }` عمدی است: معنای «نفیِ ترکیبِ هر سه شرط» را
              // بدونِ ابهام می‌دهد. شکلِ کوتاهِ `NOT: { a, b, c }` در Prisma می‌تواند به
              // «نفیِ تک‌تک» تفسیر شود که معنایش کاملاً چیزِ دیگری است.
              NOT: {
                AND: [
                  { status: 'pending' },
                  { paymentStatus: 'unpaid' },
                  { createdAt: { lt: staleCutoff } },
                ],
              },
            },
            select: { id: true },
          })
        : null;

      if (!conflict && !deliberatelyCancelled) {
        try {
          // پرداخت موفق ⇒ نوبت خودکار «تایید» می‌شود (نیازی به تاییدِ دستیِ آرایشگر نیست).
          await prisma.booking.update({
            where: { id: booking.id },
            data: { paymentStatus: 'paid', status: 'confirmed', paymentRefId: verify.refId || null },
          });
          return resultUrl(`status=success&code=${booking.code}`);
        } catch (e) {
          // P2002 = ایندکسِ یکتای اسلات؛ یعنی دقیقاً در همین لحظه ساعت به رزروِ دیگری رسید.
          if (e?.code !== 'P2002') throw e;
        }
      }

      // اسلات از دست رفته ولی پول گرفته شده: وضعیت را صادقانه ثبت کن تا نه در آمار گم شود
      // و نه مشتری پیامِ دروغ ببیند. آرایشگاه باید دستی تعیین تکلیف کند (استرداد یا ساعتِ دیگر).
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'cancelled',
          paymentStatus: 'refundPending',
          paymentRefId: verify.refId || null,
        },
      });
      log.error(`slot lost after successful payment — code=${booking.code}`);
      return resultUrl(`status=slot_lost&code=${booking.code}`);
    }

    if (verify.ok && amountMismatch) {
      // پول گرفته شده ولی مبلغ نمی‌خواند ⇒ نیازِ بررسیِ دستی، نه «ناموفق».
      //
      // ⚠️ status هم به cancelled می‌رود. بدونِ آن، رکورد در حالتِ pending می‌ماند و چون
      // paymentStatus دیگر unpaid نیست، نه جاروکشِ کرون و نه آزادسازیِ لحظه‌ای سراغش
      // نمی‌روند — یعنی آن ساعت **برای همیشه** قفل می‌شد.
      log.error(
        `amount mismatch for ${booking.code}: paid=${paidAmount} expected=${booking.amount} refId=${verify.refId || '-'}`,
      );
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'cancelled', paymentStatus: 'refundPending', paymentRefId: verify.refId || null },
      });
      return resultUrl(`status=needs_review&code=${booking.code}`);
    }

    // تأییدِ درگاه ناموفق بود ⇒ هیچ پولی گرفته نشده؛ رزروِ موقت آزاد می‌شود.
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'failed', status: 'cancelled' },
    });
    return resultUrl(`status=failed&code=${booking.code}`);
  } catch (e) {
    // 🔴 اینجا بدترین حالتِ ممکن است: ممکن است پول گرفته شده باشد ولی ثبتش نشده. پس هر
    // سرنخی که برای پیداکردنِ تراکنش لازم است باید در لاگ بماند — کدِ رهگیری و شناسه‌ی
    // تراکنشِ درگاه. قبلاً فقط خودِ خطا لاگ می‌شد و هیچ راهی برای ردیابی نمی‌ماند.
    log.error(
      `verify failed — code=${booking?.code || '-'} authority=${authority || '-'} paymentTaken=${paymentTaken}`,
      e,
    );
    // اگر درگاه پرداخت را تأیید کرده بود ولی ثبتش شکست خورد، پیامِ «مبلغی کسر نشد» دروغ است.
    const outcome = paymentTaken ? 'needs_review' : 'failed';
    // کدِ رهگیری هم همراه می‌رود تا مشتری بتواند موقعِ تماس اعلامش کند.
    return resultUrl(booking?.code ? `status=${outcome}&code=${booking.code}` : `status=${outcome}`);
  }
}
