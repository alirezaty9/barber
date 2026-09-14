// فشرده‌سازیِ عکس در «مرورگر» به یک data URLِ کوچک — بدونِ نیاز به سرور یا سرویسِ بیرونی.
// عکس روی یک canvas کوچک کشیده و به JPEG تبدیل می‌شود تا حجمِ ذخیره‌شده در دیتابیس کم بماند.
//
// data URL چیست؟ یک رشته‌ی متنی که خودِ محتوای عکس را (به‌صورت base64) در دلِ خود دارد،
// مثل: data:image/jpeg;base64,/9j/4AAQ...  — این‌طور عکس مستقیم داخلِ دیتابیس/HTML جا می‌شود
// و نیازی به آپلود روی یک فضای ذخیره‌ی جدا نیست. این انتخاب روی هر هاستی امن است: چه
// هاستی که فایل‌سیستمش فقط‌خواندنی است و چه هاستی که فایل‌سیستمش بعد از هر دیپلوی پاک
// می‌شود — چون عکس داخلِ خودِ دیتابیس می‌ماند، نه روی دیسکِ سرور.
export function compressImageToDataUrl(file, { maxDim = 800, quality = 0.8, maxBytes = 200_000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('فایلِ انتخابی عکس نیست.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // کوچک‌کردنِ ابعاد تا بزرگ‌ترین بُعد ≤ maxDim (نسبتِ تصویر حفظ می‌شود).
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // کاهشِ تدریجیِ کیفیت تا حجمِ خروجی زیرِ سقف بیاید (۱.۳۷ ≈ سربارِ base64).
      let q = quality;
      let dataUrl = canvas.toDataURL('image/jpeg', q);
      while (dataUrl.length > maxBytes * 1.37 && q > 0.4) {
        q -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', q);
      }
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('عکس قابلِ خواندن نبود.'));
    };
    img.src = url;
  });
}
