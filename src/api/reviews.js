import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export const reviewsKey = ['reviews'];

export function useReviews(initialData) {
  return useQuery({
    queryKey: reviewsKey,
    queryFn: () => http('/api/reviews'),
    initialData,
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => http('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewsKey }),
  });
}
