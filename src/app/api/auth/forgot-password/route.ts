import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = await rateLimit(`forgot-password:${ip}`, 3, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const { email, turnstile_token } = body;

    // Verify Turnstile CAPTCHA
    const turnstileOk = await verifyTurnstile(turnstile_token);
    if (!turnstileOk) {
      return NextResponse.json(
        { error: "Xác minh CAPTCHA thất bại. Vui lòng thử lại." },
        { status: 400 }
      );
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { error: "Vui lòng nhập email" },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const host = headersList.get("host") || "dangkhuong.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const origin = `${protocol}://${host}`;

    const supabase = await createAdminClient();

    // Generate recovery link using admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      },
    });

    if (!error && data?.properties?.action_link) {
      // Extract token_hash and build custom reset URL
      const actionUrl = new URL(data.properties.action_link);
      const tokenHash = actionUrl.searchParams.get("token");
      const resetUrl = `${origin}/reset-password?token_hash=${tokenHash}&type=recovery`;

      // Get user name
      let name = email.split("@")[0];
      try {
        const { data: users } = await supabase.auth.admin.listUsers();
        const matchedUser = users?.users?.find((u) => u.email === email);
        if (matchedUser?.user_metadata?.full_name) {
          name = matchedUser.user_metadata.full_name;
        }
      } catch {
        // fallback to email prefix
      }

      await sendPasswordResetEmail(email, name, resetUrl).catch(() => {});
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.",
    });
  } catch (err) {
    console.error("[Forgot Password API] Error:", err);
    return NextResponse.json({
      success: true,
      message: "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.",
    });
  }
}
