// صفحه‌ی /pwa-check یک ابزارِ موقتِ عیب‌یابی است، نه صفحه‌ای برای مشتری.
//
// خودِ صفحه یک کامپوننتِ مرورگری است و کامپوننتِ مرورگری نمی‌تواند تنظیماتِ سئو را اعلام
// کند؛ پس این لایه‌ی نازک فقط برای همین یک کار وجود دارد: به موتورهای جست‌وجو بگوید این
// صفحه را در نتایج نشان ندهند.
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
  title: 'بررسی نصب اپ',
};

export default function PwaCheckLayout({ children }) {
  return children;
}
