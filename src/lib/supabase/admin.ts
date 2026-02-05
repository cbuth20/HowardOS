import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Create a Supabase admin client with service role key
 * WARNING: This client bypasses Row Level Security (RLS)
 * Only use for admin operations that require elevated privileges
 * Never expose this client to the browser
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
