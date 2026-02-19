import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient<Database> | null = null

function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const hostname = window.location.hostname
  // Share cookies across *.howard-finance.com subdomains
  if (hostname.endsWith('.howard-finance.com')) {
    return '.howard-finance.com'
  }
  // localhost and *.netlify.app - no shared domain needed
  return undefined
}

export function createClient() {
  if (!client) {
    const cookieDomain = getCookieDomain()
    client = createBrowserClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        cookieOptions: {
          domain: cookieDomain,
          path: '/',
          sameSite: 'lax',
          secure: import.meta.env.PROD,
        },
      }
    )
  }
  return client
}
