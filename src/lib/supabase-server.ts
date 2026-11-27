import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { runtimeEnv } from '@/lib/server/runtime-env'

const supabaseUrl = runtimeEnv('NEXT_PUBLIC_SUPABASE_URL')!
const supabaseAnonKey = runtimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')!

export async function createServerClient() {
  // Reading cookies here opts this route out of static rendering.
  await cookies()

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

