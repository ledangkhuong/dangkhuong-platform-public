import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase Session Configuration (set in Supabase Dashboard > Auth > Settings):
 * - JWT expiry: 3600 (1 hour) — default, recommended for general use
 * - Refresh token rotation: enabled — prevents token reuse after rotation
 * - Refresh token reuse interval: 10 seconds — grace period for concurrent requests
 *
 * Security notes:
 * - On password change, all other sessions are revoked via signOut({ scope: 'others' })
 *   in the reset-password page (src/app/reset-password/page.tsx)
 * - For sensitive operations, re-verify the session server-side:
 *     const { data: { user } } = await supabase.auth.getUser();
 *   getUser() validates the JWT against the Supabase auth server, not just decoding locally
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// Admin client dùng supabase-js trực tiếp (bypass RLS hoàn toàn)
export async function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
