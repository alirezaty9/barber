import { SHOP_NAME } from '@/lib/shop';

// لوگوی نوشتاریِ برند: کلمه‌ی اول طلایی، بقیه روشن.
//
// 🎯 چرا کامپوننت شد؟ این ترکیب عیناً در نوارِ بالا و فوتر تکرار شده بود و نامِ مجموعه هم
// در هر دو **دستی** نوشته شده بود — یعنی با عوض‌شدنِ نام در shop.js، لوگوها نامِ قدیمی را
// نگه می‌داشتند و سایت دو برند نشان می‌داد. حالا هر دو از یک منبع می‌خوانند.
export default function BrandWordmark({ className = '', accentClassName = 'text-zinc-100' }) {
  const [first, ...rest] = SHOP_NAME.split(' ');
  return (
    <span dir="ltr" className={className}>
      {first} {rest.length > 0 && <span className={accentClassName}>{rest.join(' ')}</span>}
    </span>
  );
}
