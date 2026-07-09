import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export const blocksKey = (barberId) => ['blocks', barberId || 'all'];

export function useBlocks(barberId) {
  return useQuery({
    queryKey: blocksKey(barberId),
    queryFn: () => http(`/api/blocks?barberId=${encodeURIComponent(barberId || 'all')}`),
    enabled: Boolean(barberId),
  });
}

export function useCreateBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => http('/api/blocks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks'] }),
  });
}

export function useDeleteBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http(`/api/blocks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blocks'] }),
  });
}
