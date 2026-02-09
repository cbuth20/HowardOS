'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // Data is fresh for 30 seconds
        gcTime: 5 * 60 * 1000, // Cache garbage collected after 5 minutes (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true, // Refetch when internet reconnects
        refetchOnMount: true, // Refetch when component mounts if data is stale
      },
      mutations: {
        // Global mutation callbacks
        onSuccess: () => {
          // Optionally add global success handling here
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
