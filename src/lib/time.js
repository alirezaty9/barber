// کمکی‌های تاریخِ مستقل از تایم‌زونِ سرور (روی Vercel سرور UTC است).
// همه‌ی تاریخ‌های اپ رشته‌ی ISO میلادی «YYYY-MM-DD» هستند و نمایش به کاربر جلالی است.

// «امروز» به وقتِ ایران.
export function tehranTodayISO() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

// جابه‌جاییِ امنِ روز روی رشته‌ی ISO (بدونِ دردسرِ تایم‌زون).
export function shiftISO(iso, deltaDays) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// شماره‌ی روزِ هفته به قراردادِ پروژه (۰=شنبه ... ۶=جمعه) از یک تاریخِ ISO میلادی.
// مستقل از تایم‌زون: تاریخ را به‌صورتِ UTC می‌سازیم تا getUTCDay ثابت بماند.
// getUTCDay: ۰=یکشنبه ... ۶=شنبه ⇒ با (dow+1)%7 به ۰=شنبه نگاشت می‌شود.
export function weekdayIndexSaturday(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (dow + 1) % 7;
}

// فهرستِ تاریخ‌های ISO از from تا to (شاملِ هر دو) با سقفِ ایمنی.
export function rangeISO(fromIso, toIso, cap = 90) {
  const end = toIso || fromIso;
  if (end < fromIso) return [fromIso];
  const out = [];
  let cur = fromIso;
  for (let i = 0; cur <= end && i < cap; i++) {
    out.push(cur);
    cur = shiftISO(cur, 1);
  }
  return out;
}
