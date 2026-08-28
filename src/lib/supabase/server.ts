import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Service-role client — bypasses RLS.
 * Uses @supabase/supabase-js directly (no cookie handling) so it is safe
 * to call from Route Handlers and webhooks where next/headers is unavailable.
 */
export async function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    console.error('[createServiceClient] ✖ NEXT_PUBLIC_SUPABASE_URL is not set')
    throw new Error('[createServiceClient] Missing NEXT_PUBLIC_SUPABASE_URL env var')
  }

  if (!key) {
    console.error('[createServiceClient] ✖ SUPABASE_SERVICE_ROLE_KEY is not set — cannot bypass RLS')
    throw new Error('[createServiceClient] Missing SUPABASE_SERVICE_ROLE_KEY env var')
  }

  console.log('[createServiceClient] ✔ using service role key (RLS bypassed)')

  return createSupabaseClient(url, key, {
    auth: {
      // Service clients must never persist sessions
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
