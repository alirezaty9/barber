'use client';

import DatePicker from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { Calendar as CalendarIcon } from 'lucide-react';

// تبدیل DateObject (تقویم شمسی) به رشته‌ی ISO میلادی YYYY-MM-DD بدون جابه‌جایی به‌خاطر timezone.
function toIso(dateObject) {
  if (!dateObject) return '';
  const d = dateObject.toDate ? dateObject.toDate() : dateObject;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * انتخابگر تاریخ شمسی (جلالی) با نمایش/ناوبری ماه و غیرفعال‌کردن روزهای مرخصی.
 * @param {string} value تاریخ ISO فعلی
 * @param {(iso:string)=>void} onChange
 * @param {(jsDate:Date)=>boolean} isDisabled روزهایی که باید غیرفعال شوند
 */
export default function JalaliDatePicker({ value, onChange, isDisabled }) {
  return (
    <DatePicker
      calendar={persian}
      locale={persian_fa}
      value={value ? new Date(value) : null}
      onChange={(d) => onChange(toIso(d))}
      minDate={new Date()}
      format="dddd D MMMM YYYY"
      calendarPosition="bottom-right"
      portal
      className="bg-dark"
      mapDays={({ date }) => {
        const jsDate = date.toDate();
        if (isDisabled && isDisabled(jsDate)) {
          return { disabled: true, style: { color: '#3f3f46', textDecoration: 'line-through' } };
        }
        return {};
      }}
      render={(val, openCalendar) => (
        <button
          type="button"
          onClick={openCalendar}
          className="w-full flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 hover:border-zinc-700 transition-colors"
        >
          <span className={val ? 'text-zinc-100' : 'text-zinc-500'}>{val || 'برای انتخاب روز کلیک کنید'}</span>
          <CalendarIcon className="w-4 h-4 text-amber-500" />
        </button>
      )}
    />
  );
}
