import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email/resend";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const origin = new URL(request.url).origin;

  if (!email) {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=${encodeURIComponent("Vui lòng nhập email.")}`,
    );
  }

  try {
    const supabase = await createAdminClient();

    // Generate recovery link using admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      },
    });

    if (error) {
      // Don't reveal if email exists or not for security
      return NextResponse.redirect(
        `${origin}/forgot-password?success=${encodeURIComponent(
          "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.",
        )}`,
      );
    }

    // Send custom email via Resend
    if (data?.properties?.action_link) {
      const name = email.split("@")[0]; // Fallback name from email
      await sendPasswordResetEmail(email, name, data.properties.action_link);
    }

    return NextResponse.redirect(
      `${origin}/forgot-password?success=${encodeURIComponent(
        "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.",
      )}`,
    );
  } catch {
    return NextResponse.redirect(
      `${origin}/forgot-password?success=${encodeURIComponent(
        "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút.",
      )}`,
    );
  }
}
