import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { http } from './http';

export const bookingsKey = (filters) => ['bookings', filters];
export const availabilityKey = (barberId, date, serviceId) => ['availability', barberId, date, serviceId];

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

// اسلات‌های آزاد یک آرایشگر در یک روز
export function useAvailability(barberId, date, serviceId, enabled = true) {
  return useQuery({
    queryKey: availabilityKey(barberId, date, serviceId),
    queryFn: () =>
      http(`/api/bookings/availability?barberId=${barberId}&date=${date}&serviceId=${serviceId || ''}`),
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

export function cancelBooking(payload) {
  return http('/api/bookings/cancel', { method: 'POST', body: JSON.stringify(payload) });
}
