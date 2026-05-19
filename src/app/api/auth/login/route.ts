import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";
import { sendLoginNotificationEmail } from "@/lib/email/transactional";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Get client IP for rate limiting
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limit before attempting login
    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau ${Math.ceil(rateCheck.retryAfterSec / 60)} phút.`,
        },
        { status: 429 }
      );
    }

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập email và mật khẩu" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed attempt for rate limiting
      await recordFailedAttempt(ip);

      // Log failed authentication attempt (non-blocking)
      logAudit({
        admin_id: "system",
        action: "auth.login_failed" as any,
        target_type: "user",
        target_id: email || "unknown",
        details: { ip, reason: "invalid_credentials" },
      }).catch(() => {});

      // Show remaining attempts warning when getting close
      const updatedCheck = await checkRateLimit(ip);
      let errorMsg = "Email hoặc mật khẩu không đúng";
      if (updatedCheck.remainingAttempts <= 2 && updatedCheck.remainingAttempts > 0) {
        errorMsg += `. Còn ${updatedCheck.remainingAttempts} lần thử.`;
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: 401 }
      );
    }

    // Login successful — reset rate limit for this IP
    await resetRateLimit(ip);

    // Update last_login and award XP (best-effort)
    const userId = signInData?.user?.id;
    try {
      if (userId) {
        const admin = await createAdminClient();
        const { error: updateErr } = await admin
          .from("profiles")
          .update({ last_login: new Date().toISOString() })
          .eq("id", userId);
        if (updateErr) {
          console.error("Failed to update last_login:", updateErr.message);
        }
        await admin.from("xp_events").insert({
          user_id: userId,
          action: "login",
          xp_amount: 10,
        });
      }
    } catch (e) {
      console.error("last_login/XP update error:", e);
    }

    // Send login notification email (non-blocking, best-effort)
    try {
      if (userId) {
        const admin = await createAdminClient();
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single();

        const userAgent = req.headers.get("user-agent") || "";
        const loginTime = new Date().toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Ho_Chi_Minh",
        });

        // Fire-and-forget — don't await
        sendLoginNotificationEmail(
          email,
          profile?.full_name || "bạn",
          ip,
          userAgent,
          loginTime,
        ).catch((err) => console.error("Login notification email error:", err));
      }
    } catch (e) {
      // Non-critical — silently ignore
      console.error("Login notification setup error:", e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
