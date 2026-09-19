import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { http } from './http';

export const bookingsKey = (filters) => ['bookings', filters];
// موجودی مستقل از خدمات است (هر نوبت = ۱ اسلات)، پس serviceId در کلید/درخواست نمی‌آید.
export const availabilityKey = (barberId, date) => ['availability', barberId, date];
export const dayScheduleKey = (barberId, date) => ['day-schedule', barberId, date];

// فهرست نوبت‌ها (ادمین) با فیلتر/جست‌وجو/صفحه‌بندی
export function useBookings(filters) {
  const params = new URLSearchParams();
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, v);
  });
  return useQuery({
    queryKey: bookingsKey(filters),
    queryFn: () => http(`/api/bookings?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}

// هر چند وقت یک‌بار فهرستِ ساعت‌های آزاد دوباره از سرور گرفته شود، **در حالی که** مشتری
// روی گامِ انتخابِ روز و ساعت ایستاده است.
//
// 🔴 چرا لازم است؟ مشتریِ «ب» صفحه‌ی انتخابِ ساعت را باز می‌کند و ساعتِ ۶ را آزاد می‌بیند.
// همان لحظه مشتریِ «الف» ساعتِ ۶ را می‌گیرد. اگر چیزی صفحه‌ی «ب» را تازه نکند، او همچنان
// ساعتِ ۶ را آزاد می‌بیند، انتخابش می‌کند، تا آخرِ مسیر می‌رود و **درست قبل از پرداخت**
// با خطا روبه‌رو می‌شود. (رزروِ تکراری اتفاق نمی‌افتد — دیتابیس جلویش را می‌گیرد — ولی
// تجربه‌ی مشتری خراب می‌شود.)
//
// با این تازه‌سازیِ دوره‌ای، ساعتِ پرشده ظرفِ چند ثانیه از فهرستِ او محو می‌شود.
const AVAILABILITY_REFRESH_MS = 20_000;

// اسلات‌های آزاد یک آرایشگر در یک روز
export function useAvailability(barberId, date, enabled = true) {
  return useQuery({
    queryKey: availabilityKey(barberId, date),
    queryFn: () => http(`/api/bookings/availability?barberId=${barberId}&date=${date}`),
    enabled: Boolean(enabled && barberId && date),
    // ⚠️ این سه تنظیم عمداً پیش‌فرضِ سراسریِ پروژه را کنار می‌زنند. پیش‌فرضِ سراسری
    // (۳۰ ثانیه کهنگیِ مجاز و بدونِ تازه‌سازی هنگامِ بازگشت به تب) برای داده‌هایی مثلِ
    // فهرستِ خدمات درست است، ولی «کدام ساعت آزاد است» تنها داده‌ای است که لحظه‌ای عوض
    // می‌شود و کهنه‌بودنش مستقیماً به مشتری آسیب می‌زند.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: AVAILABILITY_REFRESH_MS,
  });
}

// برنامه‌ی یک روز برای ادمین — اسلات‌ها + جزئیاتِ رزروِ هر ساعت (نام مشتری و…)
export function useDaySchedule(barberId, date, enabled = true) {
  return useQuery({
    queryKey: dayScheduleKey(barberId, date),
    queryFn: () => http(`/api/bookings/day?barberId=${barberId}&date=${date}`),
    enabled: Boolean(enabled && barberId && date),
  });
}

// ثبت نوبت (مشتری یا ادمین)
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => http('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

// شروع پرداخت آنلاین (مشتری) — رزرو موقت ساخته و آدرس درگاه زرین‌پال برگردانده می‌شود.
export function useRequestPayment() {
  return useMutation({
    mutationFn: (data) => http('/api/payment/request', { method: 'POST', body: JSON.stringify(data) }),
  });
}

// تغییر وضعیت نوبت (ادمین)
export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) =>
      http(`/api/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

// حذف نوبت (ادمین)
export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http(`/api/bookings/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
}

// رهگیری و لغو توسط مشتری (بدون cache)
export function lookupBooking(payload) {
  return http('/api/bookings/lookup', { method: 'POST', body: JSON.stringify(payload) });
}

// گامِ ۱ لغو: درخواستِ کدِ تأییدِ دومرحله‌ای (به موبایلِ همان نوبت ارسال می‌شود).
export function requestCancelOtp(payload) {
  return http('/api/bookings/cancel/request', { method: 'POST', body: JSON.stringify(payload) });
}

// گامِ ۲ لغو: ارسالِ کد + OTP برای لغوِ نهایی.
export function cancelBooking(payload) {
  return http('/api/bookings/cancel', { method: 'POST', body: JSON.stringify(payload) });
}
