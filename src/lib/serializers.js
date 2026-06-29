// تبدیل رکوردهای دیتابیس به شکل تمیز برای کلاینت و برعکس.
// مهم‌ترین کار: workDays که در SQLite به‌صورت CSV ذخیره می‌شود را به آرایه‌ی عدد تبدیل می‌کنیم.

export function workDaysToArray(csv) {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export function workDaysToCsv(arr) {
  if (!Array.isArray(arr)) return '';
  return [...new Set(arr.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n)))]
    .sort((a, b) => a - b)
    .join(',');
}

export function serializeBarber(barber) {
  if (!barber) return barber;
  return { ...barber, workDays: workDaysToArray(barber.workDays) };
}

export function serializeBarbers(barbers) {
  return barbers.map(serializeBarber);
}
