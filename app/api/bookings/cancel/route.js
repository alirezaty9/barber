import { prisma } from '@/lib/db';
import { lookupSchema } from '@/lib/validation';
import { ok, parseBody, notFound, conflict, serverError } from '@/lib/api-helpers';

// POST — لغو نوبت توسط مشتری فقط با کد رهگیری (عمومی).
export async function POST(request) {
  const { data, response } = await parseBody(request, lookupSchema);
  if (response) return response;

  try {
    const booking = await prisma.booking.findUnique({ where: { code: data.code.trim() } });
    if (!booking) {
      return notFound('نوبتی با این کد یافت نشد.');
    }
    if (booking.status === 'cancelled') {
      return conflict('این نوبت قبلاً لغو شده است.');
    }
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled' },
      include: { service: true, barber: true },
    });
    return ok(updated);
  } catch {
    return serverError();
  }
}
