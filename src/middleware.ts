/**
 * Next.js Middleware — Supabase session refresh + route protection + security headers.
 *
 * NOTE: In Next.js 16 the `middleware.ts` convention is deprecated in favour of
 * `proxy.ts` (Node.js runtime). The `middleware.ts` name is kept here because
 * the edge runtime is NOT supported in `proxy.ts` yet and for backward
 * compatibility. When the migration is complete, rename this file to `proxy.ts`
 * and export the handler as `proxy` instead of the default export:
 *   npx @next/codemod@canary middleware-to-proxy .
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

/** Routes that require an authenticated Supabase session. */
const PROTECTED_PREFIXES = ["/admin", "/dashboard", "/instructor"];

/** Where unauthenticated users are sent. */
const LOGIN_PATH = "/login";

// ---------------------------------------------------------------------------
// Security headers NOT already set by next.config.ts
//
// next.config.ts already covers:
//   X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security,
//   Referrer-Policy, Permissions-Policy, X-XSS-Protection,
//   X-DNS-Prefetch-Control, X-Permitted-Cross-Domain-Policies,
//   Content-Security-Policy, Report-To
// ---------------------------------------------------------------------------

const EXTRA_SECURITY_HEADERS: Record<string, string> = {
  /** Isolate browsing context — prevents cross-origin window.opener access. */
  "Cross-Origin-Opener-Policy": "same-origin",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

// ---------------------------------------------------------------------------
// Middleware (named export — Next.js 16 also accepts `export function proxy`)
// ---------------------------------------------------------------------------

export default async function middleware(request: NextRequest) {
  // --- 0. Forward current pathname to Server Components via request header.
  //         Used by <AutoPixel /> in root layout to look up DB-bound Pixel.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-dk-pathname", request.nextUrl.pathname);

  // --- 1. Prepare a mutable response so Supabase can write refreshed cookies ---
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1a. Mirror cookies onto the *request* so downstream Server
          //     Components / Route Handlers see the refreshed values.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // 1b. Re-create the response so the updated request is forwarded.
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });

          // 1c. Write Set-Cookie headers on the *response* so the browser
          //     stores the refreshed tokens.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT call supabase.auth.getSession() between createServerClient
  // and supabase.auth.getUser(). A getSession() call without a preceding
  // getUser() returns the *unverified* session from the cookie — that is not
  // suitable for authorization decisions.
  //
  // getUser() sends a request to the Supabase Auth server every time, which
  // guarantees the returned data is authentic and triggers a token refresh when
  // the access token has expired.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- 2. Route protection ---------------------------------------------------

  const { pathname } = request.nextUrl;

  if (!user && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    // Preserve the intended destination so the login page can redirect back.
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- 3. Attach extra security headers --------------------------------------

  for (const [key, value] of Object.entries(EXTRA_SECURITY_HEADERS)) {
    supabaseResponse.headers.set(key, value);
  }

  return supabaseResponse;
}

// ---------------------------------------------------------------------------
// Matcher — skip paths where middleware should NOT run
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api           (API routes — they handle their own auth)
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Common static asset extensions served from /public
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
