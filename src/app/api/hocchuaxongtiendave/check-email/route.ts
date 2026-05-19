import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/hocchuaxongtiendave/check-email
 * Body: { email }
 * Returns: { exists: boolean, fullName?: string | null }
 *
 * Used by the landing page to auto-detect returning customers and adjust
 * the form UI (hide name/phone fields when the email already has an account).
 *
 * Heavy rate-limit to prevent user enumeration abuse.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`hcxtdv-checkmail:${ip}`, 20, 300); // 20 checks / 5 min / IP
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
    const admin = await createAdminClient();

    // Pattern matches forgot-password.ts: list users, filter in JS
    const { data: users } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const matchedUser = users?.users?.find(
      (u) => u.email?.toLowerCase() === trimmed
    );

    if (!matchedUser) {
      return NextResponse.json({ exists: false });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", matchedUser.id)
      .maybeSingle();

    return NextResponse.json({
      exists: true,
      fullName:
        profile?.full_name ||
        (matchedUser.user_metadata?.full_name as string | undefined) ||
        null,
    });
  } catch (err) {
    console.error("[CheckEmail Error]", err);
    return NextResponse.json({ exists: false });
  }
}
