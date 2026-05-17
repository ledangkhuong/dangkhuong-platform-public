import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes yêu cầu đăng nhập
const PROTECTED = ["/dashboard", "/courses", "/community", "/crm", "/email", "/leaderboard", "/events", "/settings", "/admin"];
// Routes chỉ dành cho khách (chưa đăng nhập)
const AUTH_ROUTES = ["/login", "/register"];

// CSRF: Webhook routes exempt from origin check (called by external services)
const CSRF_EXEMPT_ROUTES = [
  "/api/sepay/webhook",
  "/api/payos/webhook",
  "/api/payos/success",
  "/api/payos/cancel",
  "/api/zalo/webhook",
  "/api/email/webhook/ses",
  "/api/email/track/open",
  "/api/email/track/click",
  "/api/email/unsubscribe",
  "/api/email/automations/process",
  "/api/subscriptions/confirm",
];

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com",
  "https://dangkhuong.com",
  "https://www.dangkhuong.com",
  ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ── CSRF Protection for API mutating requests ──
  if (path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const isExempt = CSRF_EXEMPT_ROUTES.some(route => path.startsWith(route));
    if (!isExempt && process.env.NODE_ENV !== "development") {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");

      let originAllowed = false;
      if (origin) {
        originAllowed = ALLOWED_ORIGINS.includes(origin);
      } else if (referer) {
        try {
          originAllowed = ALLOWED_ORIGINS.includes(new URL(referer).origin);
        } catch { /* invalid referer */ }
      }
      // No origin AND no referer on mutating request = reject (fail-closed)
      if (!origin && !referer) originAllowed = false;

      if (!originAllowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    // API routes don't need auth redirect logic below
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Redirect to login nếu chưa đăng nhập và vào protected route
    const isProtected = PROTECTED.some(p => path.startsWith(p));
    if (!user && isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect to dashboard nếu đã đăng nhập mà vào /login, /register
    const isAuthRoute = AUTH_ROUTES.some(p => path.startsWith(p));
    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // OAuth user without phone → redirect to complete-profile
    // Skip if already on complete-profile or auth/api routes
    if (user && !path.startsWith("/complete-profile") && !path.startsWith("/auth/") && !path.startsWith("/api/")) {
      const isOAuth = user.app_metadata?.provider !== "email"
        && user.app_metadata?.providers?.some((p: string) => ["google", "facebook"].includes(p));

      if (isOAuth) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();

        if (!profile?.phone) {
          return NextResponse.redirect(new URL("/complete-profile", request.url));
        }
      }
    }
  } catch {
    // Fail-closed for protected routes
    const isProtected = PROTECTED.some(p => path.startsWith(p));
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|cafe|robots.txt|sitemap.xml).*)"],
};
