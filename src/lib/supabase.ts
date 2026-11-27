import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { runtimeEnv } from '@/lib/server/runtime-env'

let client: SupabaseClient | null = null

/** Returns null when Supabase isn't configured. Callers must handle that. */
export function getSupabase(): SupabaseClient | null {
  const url = runtimeEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anonKey = runtimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!url || !anonKey) return null
  client ??= createClient(url, anonKey)
  return client
}
