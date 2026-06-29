import { prisma } from '@/lib/db';
import { lookupSchema } from '@/lib/validation';
import { ok, parseBody, notFound, serverError } from '@/lib/api-helpers';

// POST — رهگیری نوبت توسط مشتری فقط با کد رهگیری (عمومی).
export async function POST(request) {
  const { data, response } = await parseBody(request, lookupSchema);
  if (response) return response;

  try {
    const booking = await prisma.booking.findUnique({
      where: { code: data.code.trim() },
      include: { service: true, barber: true },
    });
    if (!booking) {
      return notFound('نوبتی با این کد یافت نشد.');
    }
    return ok(booking);
  } catch {
    return serverError();
  }
}
