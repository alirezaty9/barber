'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock, Loader2, Clock, Phone, User, Scissors, Sparkles, Ban,
} from 'lucide-react';
import { useBarbers } from '@/api/barbers';
import { useDaySchedule } from '@/api/bookings';
import { tehranTodayISO } from '@/lib/time';
import { toPersianDigits, formatJalaliDate, formatPrice } from '@/lib/persian';
import { STATUS_LABELS, PAYMENT_LABELS, STATUS_STYLES, PAYMENT_STYLES } from '@/lib/constants';
import DayPicker from '@/components/ui/DayPicker';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

// کلیدِ ذخیره‌ی «ساعت‌های دیده‌شده» در حافظه‌ی مرورگر (localStorage).
// localStorage یک انبارِ کوچکِ کلید/مقدار در خودِ مرورگرِ کاربر است که بعد از رفرش هم می‌ماند؛
// اینجا فقط idِ رزروهایی که آرایشگر یک‌بار بازشان کرده را نگه می‌داریم تا زرد→سبز شوند.
const SEEN_KEY = 'admin-seen-bookings';

function loadSeen() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

// صفحه‌ی «برنامه‌ی روزانه»: دقیقاً مثل رزروِ مشتری (انتخاب روز → دیدنِ ساعت‌ها)،
// با این تفاوت که آرایشگر روی هر ساعتِ رزروشده کلیک می‌کند تا ببیند کدام مشتری آن را گرفته.
// ساعتِ رزروشده‌ی «دیده‌نشده» زرد است؛ بعد از اولین کلیک سبز می‌شود.
export default function DaySchedule() {
  const { data: barbers = [] } = useBarbers();
  const barberId = barbers[0]?.id || '';

  // پیش‌فرض: امروز (به وقتِ ایران) — طبقِ خواسته، همان لحظه‌ی ورود انتخاب شده باشد.
  const [dateIso, setDateIso] = useState(tehranTodayISO);
  const [seen, setSeen] = useState(loadSeen);
  const [active, setActive] = useState(null); // رزروِ بازشده در مودال

  const { data, isLoading, isFetching } = useDaySchedule(barberId, dateIso, Boolean(barberId));
  const slots = data?.slots || [];
  const dayOff = data?.dayOff;

  const booked = slots.filter((s) => s.booking);

  // idِ رزرو را در فهرستِ دیده‌شده‌ها ذخیره کن (هم در state هم در localStorage).
  const markSeen = useCallback((id) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try { window.localStorage.setItem(SEEN_KEY, JSON.stringify([...next])); } catch { /* حافظه پر/غیرفعال */ }
      return next;
    });
  }, []);

  const openBooking = (slot) => {
    markSeen(slot.booking.id);
    setActive(slot);
  };

  // اگر tab بین چند مرورگر/زبانه باز باشد، دیده‌شده‌ها را هم‌گام نگه دار.
  useEffect(() => {
    const onStorage = (e) => { if (e.key === SEEN_KEY) setSeen(loadSeen()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-amber-500" /> برنامه‌ی روزانه
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          یک روز را انتخاب کن و ساعت‌های رزرو‌شده را ببین — روی هر ساعت بزن تا بفهمی کدام مشتری آن نوبت را گرفته.
        </p>
      </div>

      {/* انتخاب روز — پیش‌فرض روی امروز */}
      <div className="glass p-4 rounded-2xl mb-5">
        <p className="text-xs text-zinc-400 mb-3">روزِ موردنظر را انتخاب کن:</p>
        <DayPicker value={dateIso} onChange={setDateIso} days={8} />
      </div>

      {/* راهنمای رنگ‌ها */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5 text-[11px] text-zinc-400">
        <Legend className="bg-amber-500/20 border-amber-500" label="رزرو جدید (ندیده)" />
        <Legend className="bg-emerald-500/15 border-emerald-500" label="دیده‌شده" />
        <Legend className="bg-zinc-900/60 border-zinc-800" label="خالی" />
        <Legend className="bg-red-950/20 border-red-950" label="بسته/گذشته" />
      </div>

      {/* خلاصه‌ی روز */}
      {!isLoading && !dayOff && (
        <p className="text-xs text-zinc-400 mb-4">
          {booked.length > 0
            ? <>در این روز <span className="text-amber-400 font-extrabold">{toPersianDigits(booked.length)}</span> نوبت رزرو شده است.</>
            : 'در این روز هنوز نوبتی رزرو نشده است.'}
        </p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm py-16">
          <Loader2 className="w-5 h-5 animate-spin" /> در حال بارگذاری برنامه‌ی روز...
        </div>
      ) : dayOff ? (
        <div className="glass p-8 rounded-3xl flex items-center justify-center gap-2 text-red-400 text-sm">
          <Ban className="w-5 h-5" /> این روز کاملاً بسته است (مرخصی / تعطیلی).
        </div>
      ) : (
        <div className={cn('grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 transition-opacity', isFetching && 'opacity-60')}>
          {slots.map((slot) => (
            <SlotButton
              key={slot.time}
              slot={slot}
              seen={slot.booking ? seen.has(slot.booking.id) : false}
              onClick={() => slot.booking && openBooking(slot)}
            />
          ))}
        </div>
      )}

      {/* جزئیاتِ نوبتِ انتخاب‌شده */}
      <BookingDetailsModal
        slot={active}
        dateIso={dateIso}
        open={Boolean(active)}
        onOpenChange={(v) => !v && setActive(null)}
      />
    </div>
  );
}

function Legend({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-3.5 h-3.5 rounded border', className)} />
      {label}
    </span>
  );
}

// یک خانه‌ی ساعت — ظاهرش دقیقاً مثل گریدِ رزروِ مشتری، با کدرنگِ زرد/سبز برای رزروها.
function SlotButton({ slot, seen, onClick }) {
  const b = slot.booking;

  // ساعتِ رزروشده: ندیده = زرد، دیده = سبز. قابلِ کلیک برای دیدنِ جزئیات.
  if (b) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`${b.customerName} — کلیک برای جزئیات`}
        className={cn(
          'py-3 px-1 rounded-xl text-xs font-bold border transition-all text-center',
          seen
            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 hover:bg-emerald-500/25'
            : 'bg-amber-500/20 border-amber-500 text-amber-300 hover:bg-amber-500/30'
        )}
      >
        <span className="block">{toPersianDigits(slot.time)}</span>
        <span className="block text-[9px] font-medium mt-0.5 truncate opacity-90">{b.customerName}</span>
      </button>
    );
  }

  // ساعتِ آزاد.
  if (slot.available) {
    return (
      <div className="py-3 px-1 rounded-xl text-xs font-bold border bg-zinc-900/60 border-zinc-800 text-zinc-400 text-center">
        <span className="block">{toPersianDigits(slot.time)}</span>
        <span className="block text-[9px] font-medium mt-0.5 text-zinc-600">خالی</span>
      </div>
    );
  }

  // گذشته یا بسته (بلاکِ ساعتی).
  const label = slot.reason === 'past' ? 'گذشته' : 'بسته';
  return (
    <div className="py-3 px-1 rounded-xl text-xs font-bold border bg-red-950/20 border-red-950 text-red-500/70 text-center opacity-70">
      <span className="block line-through">{toPersianDigits(slot.time)}</span>
      <span className="block text-[9px] font-medium mt-0.5">{label}</span>
    </div>
  );
}

// مودالِ جزئیاتِ نوبت — نام، موبایل، خدمت، وضعیت، مبلغ و ساعت.
function BookingDetailsModal({ slot, dateIso, open, onOpenChange }) {
  const b = slot?.booking;
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="جزئیات نوبت">
      {b && (
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-bold tracking-wider uppercase">جزئیات نوبت</span>
          </div>
          <h3 className="text-xl font-extrabold text-white mb-5">
            {formatJalaliDate(dateIso, { weekday: 'long', day: 'numeric', month: 'long' })} — ساعت {toPersianDigits(slot.time)}
          </h3>

          <div className="space-y-3">
            <DetailRow icon={User} label="مشتری" value={b.customerName} />
            <DetailRow
              icon={Phone}
              label="موبایل"
              value={<span className="font-mono" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>{toPersianDigits(b.customerPhone)}</span>}
            />
            <DetailRow icon={Scissors} label="خدمت" value={b.servicesLabel} />
            <DetailRow icon={Clock} label="ساعت" value={toPersianDigits(slot.time)} />
            <DetailRow icon={Sparkles} label="مبلغ" value={formatPrice(b.amount || 0)} />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-5">
            <span className={cn('px-3 py-1.5 rounded-full text-[11px] font-bold border', STATUS_STYLES[b.status])}>
              {STATUS_LABELS[b.status]}
            </span>
            <span className={cn('px-3 py-1.5 rounded-full text-[11px] font-bold border', PAYMENT_STYLES[b.paymentStatus] || PAYMENT_STYLES.unpaid)}>
              {PAYMENT_LABELS[b.paymentStatus] || PAYMENT_LABELS.unpaid}
            </span>
            <span className="px-3 py-1.5 rounded-full text-[11px] font-mono font-bold border border-zinc-800 text-zinc-400">
              {b.code}
            </span>
          </div>

          <p className="text-[11px] text-zinc-500 mt-5 leading-relaxed">
            برای لغو یا حذفِ این نوبت، از تبِ «لیست نوبت‌ها» در همین صفحه استفاده کن. (نوبتِ پرداخت‌شده خودکار «تایید» است.)
          </p>
        </div>
      )}
    </Modal>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-900 rounded-xl px-4 py-3">
      <Icon className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="text-xs text-zinc-500 w-16 shrink-0">{label}</span>
      <span className="text-sm font-bold text-zinc-100 flex-1">{value}</span>
    </div>
  );
}
