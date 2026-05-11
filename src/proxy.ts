import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes yêu cầu đăng nhập
const PROTECTED = ["/dashboard", "/courses", "/community", "/crm", "/email", "/leaderboard", "/events", "/settings", "/admin"];
// Routes chỉ dành cho khách (chưa đăng nhập)
const AUTH_ROUTES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
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
    const path = request.nextUrl.pathname;

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
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|cafe|robots.txt|sitemap.xml).*)"],
};
