// تبدیل فایل عکسِ انتخابیِ کاربر به یک Data URL کوچک‌شده و فشرده — کاملاً سمت کلاینت.
// چرا این روش؟ روی Vercel فایل‌سیستم فقط‌خواندنی است و نمی‌توان فایل آپلودی را روی دیسک
// ذخیره کرد. با کوچک‌کردن و فشرده‌سازی، عکس به‌صورت یک رشته‌ی `data:` در همان فیلدِ
// موجود دیتابیس ذخیره می‌شود و بدون هیچ زیرساخت اضافه‌ای هم لوکال و هم آنلاین کار می‌کند.

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('بارگذاری تصویر ناموفق بود.'));
    img.src = src;
  });
}

/**
 * فایل تصویری را می‌گیرد و یک Data URL فشرده (JPEG) با حداکثر ضلع `maxSize` برمی‌گرداند.
 * @param {File} file فایل انتخابی کاربر
 * @param {number} maxSize بزرگ‌ترین ضلع خروجی (پیکسل)
 * @param {number} quality کیفیت JPEG بین ۰ تا ۱
 */
export async function resizeImageToDataUrl(file, maxSize = 512, quality = 0.82) {
  if (!file.type?.startsWith('image/')) throw new Error('فقط فایل تصویری مجاز است.');
  const raw = await readAsDataUrl(file);
  const img = await loadImage(raw);

  let { width, height } = img;
  if (width > maxSize || height > maxSize) {
    if (width >= height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // JPEG برای حجم کمتر (شفافیت لازم نیست چون آواتار/عکس آرایشگر است).
  return canvas.toDataURL('image/jpeg', quality);
}
