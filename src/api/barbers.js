import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

// پروژه تک‌آرایشگره است: فقط خواندن و ویرایشِ همان یک آرایشگر لازم است.
// 🧹 هوک‌های «ساختِ آرایشگر» و «حذفِ آرایشگر» در ۱۴۰۵/۰۶/۲۸ حذف شدند — هیچ صفحه‌ای
// صدایشان نمی‌زد و بازمانده‌ی نسخه‌ی چندآرایشگره بودند.

export const barbersKey = ['barbers'];

export function useBarbers(initialData) {
  return useQuery({
    queryKey: barbersKey,
    queryFn: () => http('/api/barbers'),
    initialData,
  });
}

export function useUpdateBarber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      http(`/api/barbers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: barbersKey }),
  });
}
