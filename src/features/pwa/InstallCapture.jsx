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
// 🔴 این اسکریپت باید «چندبار-اجرا-امن» باشد.
// محتوایش دو بار در صفحه می‌آید: یک‌بار به‌عنوانِ اسکریپتِ واقعی، و یک‌بار داخلِ داده‌ای که
// React برای بالا آوردنِ صفحه می‌فرستد. اگر React همان را دوباره اجرا کند و خطِ اولش
// «اجازه را خالی کن» باشد، اجازه‌ی گرفته‌شده **پاک می‌شود** و دکمه‌ی نصب هرگز فعال نمی‌شود.
// پس: اجازه فقط وقتی خالی می‌شود که از قبل وجود نداشته باشد، و گوش‌دادن هم فقط یک‌بار
// ثبت می‌شود.
const CAPTURE_SCRIPT = `(function(){
  if (window.__pwaCaptureReady) return;
  window.__pwaCaptureReady = true;
  if (!('${INSTALL_EVENT_KEY}' in window)) window.${INSTALL_EVENT_KEY} = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.${INSTALL_EVENT_KEY} = e;
    window.dispatchEvent(new Event('${INSTALL_READY_EVENT}'));
  });
  window.addEventListener('appinstalled', function () {
    window.${INSTALL_EVENT_KEY} = null;
    window.dispatchEvent(new Event('${INSTALL_READY_EVENT}'));
  });
})();`;

// چیزی روی صفحه نمی‌کشد؛ فقط اسکریپتِ بالا را در خروجیِ صفحه می‌گذارد.
export default function InstallCapture() {
  return <script dangerouslySetInnerHTML={{ __html: CAPTURE_SCRIPT }} />;
}
