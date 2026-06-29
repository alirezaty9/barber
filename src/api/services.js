import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export const servicesKey = ['services'];

export function useServices(initialData) {
  return useQuery({
    queryKey: servicesKey,
    queryFn: () => http('/api/services'),
    initialData,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => http('/api/services', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesKey }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      http(`/api/services/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesKey }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http(`/api/services/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: servicesKey }),
  });
}
