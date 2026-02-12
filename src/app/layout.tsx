import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './globals.css'

// Display / Headlines - Instrument Serif
const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
})

// Body / UI - DM Sans
const dmSans = DM_Sans({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

// System / Mono - JetBrains Mono
const jetbrainsMono = JetBrains_Mono({
  weight: ['300', '400'],
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HowardOS - Client Portal',
  description: 'Multi-tenant client portal with file sharing and task management',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className={dmSans.className}>
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
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
