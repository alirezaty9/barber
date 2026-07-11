'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import ConfirmHost from '@/components/ui/ConfirmHost';
import WebVitals from '@/features/dev/WebVitals';

export default function Providers({ children }) {
  // یک نمونه QueryClient پایدار به‌ازای هر بارگذاری اپ (نه در هر رندر).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* ابزارِ سنجشِ Web Vitals فقط در توسعه؛ در production بارگذاری/اجرا نمی‌شود. */}
      {process.env.NODE_ENV !== 'production' && <WebVitals />}
      {children}
      <ConfirmHost />
      <Toaster
        position="top-center"
        dir="rtl"
        richColors
        toastOptions={{
          style: { fontFamily: 'var(--font-sans)' },
        }}
      />
    </QueryClientProvider>
  );
}
