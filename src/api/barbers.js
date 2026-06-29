import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export const barbersKey = ['barbers'];

export function useBarbers(initialData) {
  return useQuery({
    queryKey: barbersKey,
    queryFn: () => http('/api/barbers'),
    initialData,
  });
}

export function useCreateBarber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => http('/api/barbers', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: barbersKey }),
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

export function useDeleteBarber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http(`/api/barbers/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: barbersKey }),
  });
}
