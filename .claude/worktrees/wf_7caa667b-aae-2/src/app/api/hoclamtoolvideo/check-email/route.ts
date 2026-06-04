import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/hoclamtoolvideo/check-email
 * Body: { email }
 *
 * Returns a constant 200 response regardless of whether the email exists
 * to prevent user-enumeration attacks.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`hoclamtoolvideo-checkmail:${ip}`, 20, 300);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ message: "If an account exists, you will receive instructions." });
    }

    const trimmed = email.trim().toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Still perform the lookup internally (for any side effects or logging),
    // but never reveal the result to the caller.
    await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(trimmed)}&page=1&per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );

    return NextResponse.json({ message: "If an account exists, you will receive instructions." });
  } catch (err) {
    console.error("[HocLamToolVideo CheckEmail Error]", err);
    return NextResponse.json({ message: "If an account exists, you will receive instructions." });
  }
}
