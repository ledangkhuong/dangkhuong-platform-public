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
  const { pathname } = request.nextUrl;

  // --- Origin validation for state-changing API requests ----------------------
  // Blocks cross-origin POST/PUT/PATCH/DELETE to API routes that are NOT
  // external callbacks (payment webhooks, tracking pixels, cron, etc.).
  if (pathname.startsWith("/api/")) {
    const isStateChanging = ["POST", "PUT", "PATCH", "DELETE"].includes(
      request.method
    );
    const exemptPrefixes = [
      "/api/sepay/",
      "/api/payos/webhook",
      "/api/email/webhook",
      "/api/email/track",
      "/api/zalo/",
      "/api/cron/",
      "/api/health",
      "/api/affiliate/click",
      "/api/analytics/",
      "/api/capi/",
    ];
    const isExempt = exemptPrefixes.some((p) => pathname.startsWith(p));

    if (isStateChanging && !isExempt) {
      const origin = request.headers.get("origin");
      const host = request.headers.get("host");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (origin) {
        const allowedOrigins = [
          appUrl,
          `https://${host}`,
          `http://${host}`, // dev
        ].filter(Boolean);
        if (
          !allowedOrigins.some(
            (ao) => origin === ao || origin.endsWith(".dangkhuong.com")
          )
        ) {
          return new NextResponse(
            JSON.stringify({ error: "Forbidden" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      } else {
        // Fallback: validate Referer when Origin header is absent.
        // Browsers omit Origin on same-origin navigations and some
        // redirects; Referer is almost always present. If both are
        // missing on a state-changing API request, reject it.
        const referer = request.headers.get("referer");
        if (referer) {
          try {
            const refOrigin = new URL(referer).origin;
            if (
              refOrigin !== appUrl &&
              refOrigin !== `https://${host}` &&
              refOrigin !== `http://${host}` &&
              !refOrigin.endsWith(".dangkhuong.com")
            ) {
              return new NextResponse(
                JSON.stringify({ error: "Forbidden" }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/json" },
                }
              );
            }
          } catch {
            return new NextResponse(
              JSON.stringify({ error: "Forbidden" }),
              {
                status: 403,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        } else {
          // Neither Origin nor Referer — reject state-changing request
          return new NextResponse(
            JSON.stringify({ error: "Forbidden" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // API routes handle their own auth — skip Supabase session refresh and
    // route protection below. Just forward with security headers.
    const apiResponse = NextResponse.next();
    for (const [key, value] of Object.entries(EXTRA_SECURITY_HEADERS)) {
      apiResponse.headers.set(key, value);
    }
    return apiResponse;
  }

  // --- 0. Forward current pathname to Server Components via request header.
  //         Used by <AutoPixel /> in root layout to look up DB-bound Pixel.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-dk-pathname", pathname);

  // --- 1. Prepare a mutable response so Supabase can write refreshed cookies ---
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // --- 1a. Anonymous fast-path ------------------------------------------------
  // The @supabase/ssr session cookie is named `sb-<project-ref>-auth-token`
  // (with chunks `…-auth-token.0`, `…-auth-token.1` for large sessions). When
  // NO such cookie is present the visitor has no session, so calling
  // supabase.auth.getUser() (a network round-trip to the Auth server) is
  // wasteful. Skip the client creation + getUser() entirely and treat the user
  // as null. Header injection (step 0) and route protection (step 2) below are
  // unaffected, so anonymous visitors hitting protected routes still redirect.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token"));

  // Typed via the getUser() return so reassignment below stays type-safe
  // without importing @supabase/supabase-js's User type directly.
  let user: Awaited<
    ReturnType<
      ReturnType<typeof createServerClient>["auth"]["getUser"]
    >
  >["data"]["user"] = null;

  if (hasAuthCookie) {
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

    // IMPORTANT: Do NOT call supabase.auth.getSession() between
    // createServerClient and supabase.auth.getUser(). A getSession() call
    // without a preceding getUser() returns the *unverified* session from the
    // cookie — that is not suitable for authorization decisions.
    //
    // getUser() sends a request to the Supabase Auth server every time, which
    // guarantees the returned data is authentic and triggers a token refresh
    // when the access token has expired.

    ({
      data: { user },
    } = await supabase.auth.getUser());
  }

  // --- 2. Route protection ---------------------------------------------------

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
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Common static asset extensions served from /public
     *
     * NOTE: API routes are included so the middleware can perform Origin
     * validation on state-changing requests. The middleware early-returns
     * for /api/ paths after the Origin check, skipping Supabase session
     * refresh and route protection (API routes handle their own auth).
     */
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
