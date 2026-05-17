"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function forgotPassword(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    redirect("/forgot-password?error=" + encodeURIComponent("Vui lòng nhập email."));
  }

  const headersList = await headers();
  const host = headersList.get("host") || "dangkhuong.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

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
      console.error("[Forgot Password] generateLink error:", error.message);
      // Don't reveal if email exists or not
      redirect(
        "/forgot-password?success=" +
          encodeURIComponent("Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút."),
      );
    }

    // Send custom email via Resend
    if (data?.properties?.action_link) {
      // Extract token_hash from Supabase's action_link and build custom reset URL
      // This bypasses Supabase's /verify redirect (which uses implicit flow with hash fragments)
      // and instead sends user directly to our reset-password page with token_hash
      const actionUrl = new URL(data.properties.action_link);
      const tokenHash = actionUrl.searchParams.get("token");
      const resetUrl = `${origin}/reset-password?token_hash=${tokenHash}&type=recovery`;

      // Get user name from user metadata or profile
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

      const result = await sendPasswordResetEmail(email, name, resetUrl);
    } else {
      console.error("[Forgot Password] No action_link in response");
    }
  } catch (err) {
    console.error("[Forgot Password] Unexpected error:", err);
  }

  redirect(
    "/forgot-password?success=" +
      encodeURIComponent("Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút."),
  );
}
