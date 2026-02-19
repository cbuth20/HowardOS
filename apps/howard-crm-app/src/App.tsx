import { Outlet } from 'react-router'
import { Toaster } from 'sonner'
import { Providers } from './app/providers'
import { ErrorBoundary } from '@howard/ui/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#EDEAE4',
              color: '#111110',
              border: '1px solid #D4D0C8',
            },
          }}
        />
        <Outlet />
      </Providers>
    </ErrorBoundary>
  )
}
