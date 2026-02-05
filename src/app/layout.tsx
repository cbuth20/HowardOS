import type { Metadata } from 'next'
import { Roboto, Crimson_Text } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

// Body and sub-headers - Roboto Light
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
})

// Headers - Crimson Text (Sitka-like serif alternative)
const crimsonText = Crimson_Text({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-crimson',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HowardOS - Client Portal',
  description: 'Multi-tenant client portal with file sharing and task management',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${roboto.variable} ${crimsonText.variable}`}>
      <body className={roboto.className}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#465352',
              border: '1px solid #D3D3D3',
            },
            success: {
              iconTheme: {
                primary: '#758C7C',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#C85A54',
                secondary: '#FFFFFF',
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}
