import { prisma } from '@/lib/db';
import { z } from 'zod';
import { ok, guardAdmin, parseBody, serverError } from '@/lib/api-helpers';

const reviewSchema = z.object({
  customerName: z.string().trim().min(1, 'نام الزامی است.'),
  rating: z.coerce.number().min(0).max(5),
  comment: z.string().trim().min(1, 'متن نظر الزامی است.'),
  date: z.string().trim().min(1),
});

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
    return ok(reviews);
  } catch {
    return serverError();
  }
}

export async function POST(request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { data, response } = await parseBody(request, reviewSchema);
  if (response) return response;

  try {
    const review = await prisma.review.create({ data });
    return ok(review, { status: 201 });
  } catch {
    return serverError();
  }
}
