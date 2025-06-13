import { createClient } from '@supabase/supabase-js'

// Service role client - bypasses RLS, use carefully!
export function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase service role credentials')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Use this client for server-side operations that need to bypass RLS
// IMPORTANT: Always validate user permissions at the application level
// when using the service client! 