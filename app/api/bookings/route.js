import { prisma } from '@/lib/db';
import { bookingSchema } from '@/lib/validation';
import { resolveAvailability } from '@/lib/availability-server';
import { resolveServices } from '@/lib/services-server';
import { isAuthenticated } from '@/lib/auth';
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
  const dateFilter = searchParams.get('date'); // all | today | tomorrow
  const q = (searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

  const where = {};
  if (barberId && barberId !== 'all') where.barberId = barberId;
  if (status && status !== 'all') where.status = status;

  if (dateFilter === 'today' || dateFilter === 'tomorrow') {
    // به وقتِ ایران (نه UTCِ سرور) تا نزدیکِ نیمه‌شب خطای یک‌روزه ندهد.
    where.date = dateFilter === 'tomorrow' ? shiftISO(tehranTodayISO(), 1) : tehranTodayISO();
  }
  if (q) {
    where.OR = [
      { customerName: { contains: q } },
      { customerPhone: { contains: q } },
    ];
  }

  try {
    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: { service: true, service2: true, barber: true },
        orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
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

// POST — ثبت نوبت (عمومی → pending، ادمین → confirmed) با بررسی تداخل سمت سرور.
export async function POST(request) {
  const { data, response } = await parseBody(request, bookingSchema);
  if (response) return response;

  try {
    // یک یا چند خدمت (بدون محدودیت تعداد) → مجموع قیمت/مدت و برچسبِ نمایش.
    const svc = await resolveServices(data.serviceIds);
    if (svc.error) return badRequest(svc.error);

    // تک‌آرایشگری: اگر آرایشگر ارسال نشد، تنها آرایشگر انتخاب می‌شود.
    const barberId = data.barberId
      || (await prisma.barber.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id;
    if (!barberId) return badRequest('آرایشگر معتبری در سیستم ثبت نشده است.');

    const admin = await isAuthenticated();
    const status = admin ? 'confirmed' : 'pending';

    // ── جلوگیری از رزروِ همزمان (race) ──
    // چکِ موجودی و ساختِ رزرو داخلِ یک تراکنشِ Serializable انجام می‌شود تا دو درخواستِ
    // همزمان نتوانند یک اسلات را دوبار بگیرند؛ در برخورد (P2034/P2002) دوباره تلاش می‌کنیم.
    const booking = await createBookingSafely({ data, svc, barberId, status, admin });
    return ok(booking, { status: 201 });
  } catch (e) {
    if (e instanceof ApiError) return e.toResponse();
    log.error('POST booking failed', e);
    return serverError();
  }
}

// ساختِ رزرو با حفاظت در برابرِ race و برخوردِ کدِ یکتا.
async function createBookingSafely({ data, svc, barberId, status, admin }) {
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
            status,
            // رزرو دستیِ ادمین ⇒ پرداخت حضوری/نقدی (paid)؛ در غیر این صورت unpaid.
            amount: svc.totalPrice,
            paymentStatus: admin ? 'paid' : 'unpaid',
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
