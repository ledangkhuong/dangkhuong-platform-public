import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/updateveo31/check-email
 * Body: { email }
 * Returns: { exists: boolean }
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`veo31-checkmail:${ip}`, 20, 300);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ exists: false });
    }

    const trimmed = email.trim().toLowerCase();

    // Look up user by email via the GoTrue admin REST API with a filter.
    // The JS client's listUsers() only returns one page and will miss users
    // once the system grows past that page size.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const lookupRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(trimmed)}&page=1&per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );
    const lookupBody = await lookupRes.json();
    // The GoTrue filter is a substring match — verify exact email equality
    const matchedUser = (lookupBody?.users as Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }> | undefined)
      ?.find((u) => u.email?.toLowerCase() === trimmed);

    if (!matchedUser) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true });
  } catch (err) {
    console.error("[Veo31 CheckEmail Error]", err);
    return NextResponse.json({ exists: false });
  }
}
