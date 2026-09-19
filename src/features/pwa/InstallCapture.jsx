import { INSTALL_EVENT_KEY, INSTALL_READY_EVENT } from './install-keys';

// گرفتنِ «اجازه‌ی نصب» در همان لحظه‌ی اولِ باز شدنِ صفحه.
//
// 🔴 چرا اینجا و نه داخلِ کدِ معمولیِ اپ؟
// مرورگر اجازه‌ی نصب را فقط **یک‌بار** و **بدونِ هشدارِ قبلی** اعلام می‌کند. اگر آن لحظه
// کسی گوش نداده باشد، آن اجازه برای همیشه از دست می‌رود و مرورگر تکرارش نمی‌کند. کدِ اپ
// تازه بعد از بالا آمدنِ کلِ صفحه شروع به گوش‌دادن می‌کند — که روی صفحه‌ی اصلی (با عکسِ
// بزرگ، فونت و داده‌ی دیتابیس) می‌تواند دیر باشد.
//
// پس این چند خط به‌صورتِ خام و پیش از هر کدِ دیگری اجرا می‌شود، اجازه را می‌گیرد و کنار
// می‌گذارد، و بعد خبر می‌دهد «اجازه آماده است» تا دکمه‌های نصب فعال شوند.
//
// 🌍 آنالوژی: منشی‌ای که از همان اول پشتِ در می‌ایستد تا نامه را تحویل بگیرد، چون پستچی
// فقط یک‌بار زنگ می‌زند و منتظر نمی‌ماند.
const CAPTURE_SCRIPT = `(function(){
  window.${INSTALL_EVENT_KEY} = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.${INSTALL_EVENT_KEY} = e;
    window.dispatchEvent(new Event('${INSTALL_READY_EVENT}'));
  });
  window.addEventListener('appinstalled', function () {
    window.${INSTALL_EVENT_KEY} = null;
  });
})();`;

// چیزی روی صفحه نمی‌کشد؛ فقط اسکریپتِ بالا را در خروجیِ صفحه می‌گذارد.
export default function InstallCapture() {
  return <script dangerouslySetInnerHTML={{ __html: CAPTURE_SCRIPT }} />;
}
