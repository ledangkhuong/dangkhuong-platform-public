import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Get client IP for rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Rate limit: 3 requests per 60 seconds per IP
    const rateLimitResult = await rateLimit(`resend-verify:${ip}`, 3, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Vui lòng đợi 1 phút trước khi gửi lại." },
        { status: 429 }
      );
    }

    const trimmedEmail = email?.trim().toLowerCase();
    if (!trimmedEmail) {
      return NextResponse.json(
        { error: "Vui lòng nhập email" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    // Find user by email
    const { data: userList } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // Use a more targeted approach: generate link for the email
    // generateLink will fail if user doesn't exist (which is fine — we return success either way)
    try {
      const { data: linkData, error: linkError } =
        await admin.auth.admin.generateLink({
          type: "signup",
          email: trimmedEmail,
          // Password is required for signup type but won't change existing password
          password: crypto.randomUUID(),
        });

      if (linkError) {
        // Don't reveal whether user exists — always return success
        console.error("[Resend] generateLink error:", linkError.message);
      } else if (linkData) {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
        const confirmUrl = `${baseUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=signup&next=/dashboard`;

        // Look up user's name for the email
        let userName = "";
        try {
          const { data: profile } = await admin
            .from("profiles")
            .select("full_name")
            .eq(
              "id",
              linkData.user?.id ?? ""
            )
            .single();
          userName = profile?.full_name || "";
        } catch {}

        const { sendVerificationEmail } = await import(
          "@/lib/email/transactional"
        );
        await sendVerificationEmail(trimmedEmail, userName, confirmUrl);
      }
    } catch (emailErr) {
      console.error(
        "[Resend] Email send failed:",
        emailErr instanceof Error ? emailErr.message : emailErr
      );
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "Nếu email tồn tại, chúng tôi đã gửi lại link xác nhận.",
    });
  } catch (err) {
    console.error("Resend verification API error:", err);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
