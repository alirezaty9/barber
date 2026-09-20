import { prisma } from './db';

// از فهرست شناسه‌ها، خدمات را می‌گیرد و مجموعِ قیمت/مدت و برچسبِ نمایش را می‌سازد.
// ترتیبِ انتخابِ کاربر حفظ می‌شود. اگر یکی نامعتبر باشد، error برمی‌گرداند.
export async function resolveServices(serviceIds) {
  // تکراری‌ها حذف می‌شوند (لایه‌ی دومِ دفاع؛ لایه‌ی اول اسکیمای ورودی است). بدونِ این، یک
  // شناسه‌ی تکراری در آرایه باعث می‌شد قیمتِ همان خدمت چند بار جمع شود و مبلغِ چندبرابر به
  // درگاه برود — چون چکِ اعتبارِ زیر با «برابریِ طول» انجام می‌شود و تکراری را معتبر می‌دید.
  const ids = Array.isArray(serviceIds) ? [...new Set(serviceIds.filter(Boolean))] : [];
  if (ids.length === 0) return { error: 'حداقل یک خدمت انتخاب کنید.' };

  const found = await prisma.service.findMany({ where: { id: { in: ids } } });
  const byId = new Map(found.map((s) => [s.id, s]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  if (ordered.length !== ids.length) return { error: 'یکی از خدمات انتخابی معتبر نیست.' };

  return {
    services: ordered,
    totalPrice: ordered.reduce((sum, x) => sum + x.price, 0),
    totalDuration: ordered.reduce((sum, x) => sum + x.duration, 0),
    label: ordered.map((x) => x.name).join(' + '),
    primaryId: ids[0],
    secondId: ids[1] || null,
  };
}
