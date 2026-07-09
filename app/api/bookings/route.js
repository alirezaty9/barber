import { prisma } from '@/lib/db';
import { bookingSchema } from '@/lib/validation';
import { resolveAvailability } from '@/lib/availability-server';
import { isAuthenticated } from '@/lib/auth';
import { ok, guardAdmin, parseBody, conflict, badRequest, serverError, generateBookingCode } from '@/lib/api-helpers';

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
    const d = new Date();
    if (dateFilter === 'tomorrow') d.setDate(d.getDate() + 1);
    where.date = d.toISOString().split('T')[0];
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
  } catch {
    return serverError();
  }
}

// POST — ثبت نوبت (عمومی → pending، ادمین → confirmed) با بررسی تداخل سمت سرور.
export async function POST(request) {
  const { data, response } = await parseBody(request, bookingSchema);
  if (response) return response;

  try {
    const serviceId2 = data.serviceId2 || null;
    const [service, service2] = await Promise.all([
      prisma.service.findUnique({ where: { id: data.serviceId } }),
      serviceId2 ? prisma.service.findUnique({ where: { id: serviceId2 } }) : Promise.resolve(null),
    ]);
    if (!service) return badRequest('خدمت انتخابی معتبر نیست.');
    if (serviceId2 && !service2) return badRequest('خدمت دوم انتخابی معتبر نیست.');

    // مدت‌زمان کل = مجموع مدت هر دو خدمت (برای محاسبه‌ی صحیح اشغال زمان).
    const totalDuration = service.duration + (service2?.duration || 0);
    const totalPrice = service.price + (service2?.price || 0);

    // موجودی با لحاظ نوبت‌های فعال و بستن‌های زمان (helper مشترک).
    const { error, dayOff, slots } = await resolveAvailability({
      barberId: data.barberId,
      date: data.date,
      serviceDuration: totalDuration,
    });
    if (error) return badRequest('آرایشگر انتخابی معتبر نیست.');
    if (dayOff) return conflict('آرایشگر در روز انتخاب‌شده مرخصی است.');
    const slot = slots.find((s) => s.time === data.timeSlot);
    if (!slot || !slot.available) {
      return conflict('این ساعت برای آرایشگر موردنظر در دسترس نیست. لطفاً زمان دیگری انتخاب کنید.');
    }

    const admin = await isAuthenticated();
    const status = admin ? 'confirmed' : 'pending';

    // تولید کد یکتا با چند تلاش در صورت برخورد
    let booking = null;
    for (let attempt = 0; attempt < 5 && !booking; attempt++) {
      try {
        booking = await prisma.booking.create({
          data: {
            code: generateBookingCode(),
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            serviceId: data.serviceId,
            serviceId2,
            barberId: data.barberId,
            date: data.date,
            timeSlot: data.timeSlot,
            status,
            // رزرو دستیِ ادمین ⇒ پرداخت حضوری/نقدی (paid)؛ در غیر این صورت unpaid.
            amount: totalPrice,
            paymentStatus: admin ? 'paid' : 'unpaid',
          },
          include: { service: true, service2: true, barber: true },
        });
      } catch (e) {
        if (e?.code !== 'P2002') throw e; // فقط برخورد کد یکتا را دوباره تلاش کن
      }
    }
    if (!booking) return serverError('ثبت نوبت ناموفق بود. دوباره تلاش کنید.');

    return ok(booking, { status: 201 });
  } catch {
    return serverError();
  }
}
