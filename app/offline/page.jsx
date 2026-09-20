import { WifiOff } from 'lucide-react';
import { SHOP_NAME } from '@/lib/shop';
import OfflineRetryButton from './OfflineRetryButton';

export const metadata = { title: `آفلاین | ${SHOP_NAME}` };

// صفحه‌ی فال‌بکِ آفلاین — وقتی کاربر اینترنت ندارد و صفحه در کش نیست نمایش داده می‌شود.
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#030303] text-zinc-100 flex items-center justify-center px-6">
      <div className="glass rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <WifiOff className="w-6 h-6 text-amber-400" />
        </div>
        <h1 className="text-lg font-extrabold mt-5">اتصال اینترنت قطع است</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-6">
          به نظر می‌رسد آفلاین هستید. لطفاً اتصال خود را بررسی کنید و دوباره تلاش کنید.
        </p>
        {/* متن می‌گفت «دوباره تلاش کنید» ولی هیچ راهی برایش نبود؛ کاربر باید خودش
            بلد می‌بود صفحه را رفرش کند. */}
        <OfflineRetryButton />
      </div>
    </div>
  );
}
