'use client';

import { useState } from 'react';
import { CalendarClock, ListFilter } from 'lucide-react';
import DaySchedule from './DaySchedule';
import BookingsManager from './BookingsManager';
import { cn } from '@/lib/utils';

// بخشِ یکپارچه‌ی «نوبت‌ها»: ترکیبِ «برنامه‌ی روزانه» (نمای ساعتیِ روز) و «لیست نوبت‌ها»
// (فیلتر/جست‌وجو/اکشن‌ها) در یک صفحه، با یک سوییچِ ساده بینشان.
export default function BookingsView() {
  const [view, setView] = useState('day'); // day | list

  return (
    <div>
      {/* سوییچِ نما */}
      <div className="inline-flex bg-zinc-900/60 border border-zinc-800 rounded-2xl p-1 mb-6">
        <TabBtn active={view === 'day'} onClick={() => setView('day')} icon={CalendarClock} label="برنامه‌ی روزانه" />
        <TabBtn active={view === 'list'} onClick={() => setView('list')} icon={ListFilter} label="لیست نوبت‌ها" />
      </div>

      {view === 'day' ? <DaySchedule /> : <BookingsManager />}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all',
        active ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
      )}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
