import { toPersianDigits } from '@/lib/persian';

// نمودارِ دوناتِ وضعیتِ نوبت‌ها — SVG سروری. سهمِ هر وضعیت را با کمانِ رنگی نشان می‌دهد.
// props: segments = [{ label, value, color }], total (مجموع).
export default function StatusDonut({ segments, total }) {
  const size = 132, stroke = 16, r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const sum = total || segments.reduce((s, x) => s + x.value, 0);

  let offset = 0;
  const arcs = segments.map((s) => {
    const frac = sum ? s.value / sum : 0;
    const len = frac * C;
    const arc = { ...s, dash: `${len} ${C - len}`, dashoffset: -offset, frac };
    offset += len;
    return arc;
  });

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
          {sum > 0 &&
            arcs.map((a, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={a.dash}
                strokeDashoffset={a.dashoffset}
                strokeLinecap="butt"
              />
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white tabular-nums leading-none">{toPersianDigits(sum)}</span>
          <span className="text-[10px] text-zinc-500 mt-1">کل نوبت</span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5">
        {segments.map((s) => {
          const pct = sum ? Math.round((s.value / sum) * 100) : 0;
          return (
            <div key={s.label} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-xs text-zinc-300 flex-1">{s.label}</span>
              <span className="text-xs font-bold text-zinc-200 tabular-nums">{toPersianDigits(s.value)}</span>
              <span className="text-[10px] text-zinc-500 tabular-nums w-9 text-left">{toPersianDigits(pct)}٪</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
