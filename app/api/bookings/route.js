import { prisma } from '@/lib/db';
import { manualBookingSchema } from '@/lib/validation';
import { resolveAvailability, releaseStalePendingSlot } from '@/lib/availability-server';
import { normalizeDigits } from '@/lib/persian';
import { resolveServices } from '@/lib/services-server';
import { tehranTodayISO, shiftISO } from '@/lib/time';
import { createLogger } from '@/lib/logger';
import { ok, guardAdmin, parseBody, badRequest, serverError, generateBookingCode, ApiError } from '@/lib/api-helpers';

const log = createLogger('bookings');

// GET — فهرست نوبت‌ها برای ادمین، با فیلتر/جست‌وجو/صفحه‌بندی.
export async function GET(request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get('barberId');
  const status = searchParams.get('status');
  // upcoming (پیش‌فرض) | today | tomorrow | past | all
  const dateFilter = searchParams.get('date');
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

  const where = {};
  if (barberId && barberId !== 'all') where.barberId = barberId;
  if (status && status !== 'all') where.status = status;
  // فیلترِ وضعیتِ پرداخت — بدونِ آن، پیداکردنِ نوبت‌های «در انتظار استرداد» (که پولشان گرفته
  // شده ولی تسویه نشده) بینِ کلِ فهرست عملاً ناممکن بود.
  const paymentStatus = searchParams.get('paymentStatus');
  if (paymentStatus && paymentStatus !== 'all') where.paymentStatus = paymentStatus;

  // تاریخ‌ها رشته‌ی YYYY-MM-DD هستند، پس مقایسه‌ی رشته‌ای دقیقاً برابرِ مقایسه‌ی تقویمی است.
  // «امروز» به وقتِ ایران محاسبه می‌شود (نه UTCِ سرور) تا نزدیکِ نیمه‌شب خطای یک‌روزه ندهد.
  const today = tehranTodayISO();
  if (dateFilter === 'today') where.date = today;
  else if (dateFilter === 'tomorrow') where.date = shiftISO(today, 1);
  // 🔴 «گذشته» و «همه» تازه اضافه شده‌اند: قبلاً در هیچ حالتی نمی‌شد نوبت‌های گذشته را دید،
  // ولی گزینه‌ی رابطِ کاربری اسمش «همه تاریخ‌ها» بود — یعنی جست‌وجوی سابقه‌ی یک مشتری همیشه
  // «یافت نشد» می‌داد، در حالی که داشبورد همان رکوردها را در جمع‌ها می‌شمرد.
  else if (dateFilter === 'past') where.date = { lt: today };
  else if (dateFilter === 'all') { /* بدونِ محدودیتِ تاریخ */ }
  else where.date = { gte: today }; // پیش‌فرض: از امروز به بعد

  if (q) {
    // شماره‌ها با ارقامِ انگلیسی ذخیره می‌شوند؛ پس برای جست‌وجوی موبایل ابتدا ارقامِ فارسی/عربیِ
    // ورودی را نرمال می‌کنیم، وگرنه تایپِ «۰۹۱۲…» هیچ نتیجه‌ای نمی‌داد. نام با متنِ خام می‌ماند.
    // mode: 'insensitive' برای نامی لازم است که با حروفِ لاتین ثبت شده باشد (Reza ↔ reza).
    const qDigits = normalizeDigits(q);
    where.OR = [
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerPhone: { contains: qDigits } },
    ];
  }

  // در نمای «گذشته» نزدیک‌ترین روزها بالا بیایند؛ در بقیه‌ی نماها ترتیبِ تقویمیِ صعودی.
  const desc = dateFilter === 'past';
  const orderBy = desc
    ? [{ date: 'desc' }, { timeSlot: 'desc' }]
    : [{ date: 'asc' }, { timeSlot: 'asc' }];

  try {
    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        // انتخابِ صریحِ ستون‌ها به‌جای کشیدنِ کلِ رکورد و کلِ رابطه‌ها. دو دلیل:
        //  • hashِ کدِ تأییدِ لغو و شناسه‌ی تراکنشِ درگاه بی‌دلیل بیرون می‌رفتند.
        //  • رابطه‌ی کاملِ خدمت شاملِ ستونِ عکس (data URL تا ۹۰۰ کیلوبایت) بود و در یک صفحه‌ی
        //    ۱۰تایی تا ۲۰ بار تکرار می‌شد — پاسخی چندمگابایتی برای فهرستی که عکس نشان نمی‌دهد.
        select: {
          id: true, code: true, customerName: true, customerPhone: true,
          date: true, timeSlot: true, status: true,
          amount: true, paymentStatus: true, paymentRefId: true,
          refundAmount: true, cancelledBy: true, servicesLabel: true,
          service: { select: { name: true } },
          service2: { select: { name: true } },
          barber: { select: { name: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.booking.count({ where }),
    ]);
    return ok({ items, total, page, pageSize });
  } catch (e) {
    log.error('GET bookings failed', e);
    return serverError();
  }
}

// POST — ثبتِ نوبتِ دستی توسط ادمین (رزروِ تلفنی/حضوری)، با بررسی تداخل سمت سرور.
//
// 🔴 این مسیر «فقط ادمین» است. قبلاً بدونِ هیچ گاردی باز بود و نتیجه‌اش یک درِ کاملاً بازِ
// بدونِ پرداخت بود: هر کسی می‌توانست با یک درخواستِ ساده نوبتِ pending بسازد و با تکرارِ آن
// روی ۱۰ اسلاتِ ۸ روز، کلِ تقویم را «پر» نگه دارد تا مشتریِ واقعی هیچ ساعتِ آزادی نبیند.
// بستنش هیچ‌چیزی را نمی‌شکند: مسیرِ عمومیِ مشتری `/api/payment/request` است و تنها
// مصرف‌کننده‌ی این مسیر، فرمِ «ثبت نوبت دستی» در پنلِ مدیریت است.
export async function POST(request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { data, response } = await parseBody(request, manualBookingSchema);
  if (response) return response;

  try {
    // یک یا چند خدمت (تا سقفِ اسکیما، بی‌تکرار) → مجموع قیمت و برچسبِ نمایش.
    const svc = await resolveServices(data.serviceIds);
    if (svc.error) return badRequest(svc.error);

    // تک‌آرایشگری: اگر آرایشگر ارسال نشد، تنها آرایشگر انتخاب می‌شود.
    const barberId = data.barberId
      || (await prisma.barber.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id;
    if (!barberId) return badRequest('آرایشگر معتبری در سیستم ثبت نشده است.');

    // ── جلوگیری از رزروِ همزمان (race) ──
    // چکِ موجودی و ساختِ رزرو داخلِ یک تراکنشِ Serializable انجام می‌شود تا دو درخواستِ
    // همزمان نتوانند یک اسلات را دوبار بگیرند؛ در برخورد (P2034/P2002) دوباره تلاش می‌کنیم.
    const booking = await createBookingSafely({ data, svc, barberId });
    return ok(booking, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return e.toResponse();
    log.error('POST booking failed', e);
    return serverError();
  }
}

// ساختِ رزرو با حفاظت در برابرِ race و برخوردِ کدِ یکتا.
async function createBookingSafely({ data, svc, barberId }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const { error, dayOff, slots } = await resolveAvailability(
          { barberId, date: data.date },
          tx,
        );
        if (error) throw new ApiError(400, 'آرایشگر انتخابی معتبر نیست.');
        if (dayOff) throw new ApiError(409, 'آرایشگر در روز انتخاب‌شده مرخصی است.');
        const slot = slots.find((s) => s.time === data.timeSlot);
        if (!slot || !slot.available) {
          throw new ApiError(409, 'این ساعت برای آرایشگر موردنظر در دسترس نیست. لطفاً زمان دیگری انتخاب کنید.');
        }
        // اسلات آزاد است ولی ممکن است یک رزروِ pending/unpaidِ کهنه هنوز روی ایندکسِ یکتا
        // اشغالش کرده باشد؛ اتمیک آزادش می‌کنیم تا INSERTِ زیر با P2002 برخورد نکند.
        await releaseStalePendingSlot(tx, { barberId, date: data.date, timeSlot: data.timeSlot });
        return tx.booking.create({
          data: {
            code: generateBookingCode(),
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            serviceId: svc.primaryId,
            serviceId2: svc.secondId,
            servicesLabel: svc.label,
            barberId,
            date: data.date,
            timeSlot: data.timeSlot,
            // رزروِ دستیِ ادمین همیشه «تایید شده» است (خودِ ادمین ثبتش کرده).
            status: 'confirmed',
            amount: svc.totalPrice,
            // وجه نقدی/حضوری دریافت شده یا بعداً دریافت می‌شود — انتخابِ ادمین در فرم.
            paymentStatus: data.paid ? 'paid' : 'unpaid',
          },
          include: { service: true, service2: true, barber: true },
        });
      }, { isolationLevel: 'Serializable' });
    } catch (e) {
      // P2002 = برخوردِ کدِ یکتا، P2034 = برخوردِ تراکنشِ همزمان → تلاشِ دوباره.
      if (e?.code === 'P2002' || e?.code === 'P2034') continue;
      throw e;
    }
  }
  // بعد از چند تلاشِ ناموفق، یعنی همان لحظه اسلات پر شد.
  throw new ApiError(409, 'این ساعت هم‌اکنون رزرو شد. لطفاً زمان دیگری انتخاب کنید.');
}
