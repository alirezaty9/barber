import { formatPrice } from '@/lib/persian';

// نمودارِ مساحتیِ روندِ درآمد — SVG کاملاً سروری (بدون کتابخانه و بدون JS کلاینت).
// نقطه‌ها از قدیم (چپ) به جدید (راست) چیده می‌شوند؛ برای همین کانتینر dir=ltr است.
// props: data = [{ label, net, full }]
export default function RevenueChart({ data }) {
  const W = 720, H = 180, PAD_T = 18, PAD_B = 6;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.net));
  const px = (i) => (n > 1 ? (i / (n - 1)) * W : W / 2);
  const py = (v) => PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(d.net).toFixed(1)}`).join(' ');
  const area = n ? `${line} L${px(n - 1).toFixed(1)} ${H} L${px(0).toFixed(1)} ${H} Z` : '';

  // اندیسِ بیشترین درآمد (برای کپشن) و برچسب‌های افقیِ کم‌تراکم.
  const peak = data.reduce((m, d, i) => (d.net > data[m].net ? i : m), 0);
  const every = Math.max(1, Math.round(n / 6));
  const ticks = data.map((d, i) => ({ label: d.label, i })).filter(({ i }) => i % every === 0 || i === n - 1);

  return (
    <div dir="ltr" className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40" role="img" aria-label="نمودار روند درآمد">
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => {
          const y = PAD_T + g * (H - PAD_T - PAD_B);
          return <line key={g} x1="0" x2={W} y1={y} y2={y} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
        })}
        <path d={area} fill="url(#rev-fill)" />
        <path d={line} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {/* با یک نقطه (بازه‌ی «امروز») مسیرِ خط فقط یک دستورِ M است و هیچ پیکسلی رسم نمی‌شود؛
            نتیجه‌اش یک کادرِ کاملاً خالی بود در حالی که عددِ درآمد بالای آن غیرِصفر بود. */}
        {n === 1 && <circle cx={px(0)} cy={py(data[0].net)} r="4" fill="#f59e0b" />}
      </svg>

      {/* 🔴 برچسب‌ها با موقعیتِ واقعیِ همان نقطه روی محور تراز می‌شوند. قبلاً داخلِ یک
          flex justify-between بودند که آن‌ها را با فاصله‌ی *مساوی* پخش می‌کرد، در حالی که
          اندیس‌هایشان فاصله‌ی مساوی ندارند (…۲۰، ۲۵، ۲۹) — پس هرچه به راست می‌رفتیم انحراف
          بیشتر می‌شد و قله‌ی درآمد به روزِ اشتباهی نسبت داده می‌شد. */}
      <div className="relative h-4 mt-2">
        {ticks.map(({ label, i }) => (
          <span
            key={i}
            className="absolute top-0 text-[10px] text-zinc-500 tabular-nums whitespace-nowrap -translate-x-1/2"
            // لبه‌ها محدود می‌شوند تا اولین و آخرین برچسب نیمی از خودشان را بیرونِ کادر نگذارند.
            style={{ left: `${Math.min(97, Math.max(3, (px(i) / W) * 100))}%` }}
          >
            {label}
          </span>
        ))}
      </div>

      {data[peak].net > 0 && (
        <p dir="rtl" className="text-[11px] text-zinc-500 mt-3 text-center">
          بیشترین درآمد: <span className="text-amber-400 font-bold">{formatPrice(data[peak].net)}</span> — {data[peak].full || data[peak].label}
        </p>
      )}
    </div>
  );
}
