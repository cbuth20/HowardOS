import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { ActiveOrgProvider } from '@/lib/context/ActiveOrgContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        onSuccess: () => {
          // Optionally add global success handling here
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ActiveOrgProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ActiveOrgProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
