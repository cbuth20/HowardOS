import { createClient as supabaseCreateClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

let client: SupabaseClient<Database> | null = null

export function createClient() {
  if (!client) {
    client = supabaseCreateClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    )
  }
  return client
}
