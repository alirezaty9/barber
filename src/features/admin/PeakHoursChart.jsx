import { toPersianDigits } from '@/lib/persian';

// نمودارِ ستونیِ شلوغیِ ساعت‌ها — SVG کاملاً سروری (بدون کتابخانه و بدون JS کلاینت).
// محورِ زمان از چپ (زودتر) به راست (دیرتر) → کانتینر dir=ltr.
// props: data = [{ label, value, full }] — label: ساعتِ نمایشی، value: تعداد نوبت.
export default function PeakHoursChart({ data }) {
  const W = 720, H = 240;
  const padT = 26, padB = 30, padX = 10;
  const plotH = H - padT - padB;
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = (W - padX * 2) / n;
  const bw = slot * 0.5; // عرضِ هر ستون
  const baseY = padT + plotH;

  // اندیسِ اوجِ شلوغی (برای هایلایت).
  const peak = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);

  return (
    <div dir="ltr" className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="نمودار شلوغی ساعت‌ها">
        <defs>
          <linearGradient id="peak-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="peak-bar-dim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3f3f46" />
            <stop offset="100%" stopColor="#27272a" />
          </linearGradient>
        </defs>

        {/* خطوطِ راهنمای افقی */}
        {[0, 0.5, 1].map((g) => {
          const y = padT + g * plotH;
          return <line key={g} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />;
        })}

        {data.map((d, i) => {
          const h = (d.value / max) * plotH;
          const x = padX + i * slot + (slot - bw) / 2;
          const y = baseY - h;
          const isPeak = i === peak && d.value > 0;
          return (
            <g key={i}>
              {/* ستون */}
              <rect
                x={x}
                y={d.value > 0 ? y : baseY - 2}
                width={bw}
                height={d.value > 0 ? h : 2}
                rx="4"
                fill={isPeak ? 'url(#peak-bar)' : 'url(#peak-bar-dim)'}
              />
              {/* عددِ بالای ستون */}
              {d.value > 0 && (
                <text x={x + bw / 2} y={y - 7} textAnchor="middle" fontSize="12" fontWeight="700" fill={isPeak ? '#fbbf24' : '#a1a1aa'}>
                  {toPersianDigits(d.value)}
                </text>
              )}
              {/* برچسبِ ساعت */}
              <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#71717a">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {data[peak].value > 0 && (
        <p dir="rtl" className="text-[11px] text-zinc-500 mt-3 text-center">
          شلوغ‌ترین ساعت: <span className="text-amber-400 font-bold">{data[peak].full}</span> با{' '}
          <span className="text-amber-400 font-bold">{toPersianDigits(data[peak].value)}</span> نوبت
        </p>
      )}
    </div>
  );
}
