import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  try {
    const { email, password, turnstile_token } = await req.json();

    // Verify Turnstile CAPTCHA
    const turnstileOk = await verifyTurnstile(turnstile_token);
    if (!turnstileOk) {
      return NextResponse.json(
        { error: "Xác minh CAPTCHA thất bại. Vui lòng thử lại." },
        { status: 400 }
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
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Update last_login and award XP (best-effort)
    // Use user from signInWithPassword response directly (more reliable than getUser)
    try {
      const userId = signInData?.user?.id;
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { error: "Có lỗi xảy ra. Vui lòng thử lại." },
      { status: 500 }
    );
  }
}
