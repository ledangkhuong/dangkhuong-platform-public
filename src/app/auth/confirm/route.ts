import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // If this is a signup confirmation, do post-registration tasks
      if (type === "signup" && data?.user) {
        const admin = await createAdminClient();
        const userId = data.user.id;

        // Auto-enroll in free course
        const { data: freeProduct } = await admin
          .from("products").select("id").eq("price", 0).limit(1).single();
        if (freeProduct) {
          try {
            await admin.from("enrollments").upsert({
              user_id: userId, product_id: freeProduct.id, source: "free",
            }, { onConflict: "user_id,product_id" });
          } catch {}
        }

        // Add registration XP
        try {
          await admin.from("xp_events").insert({
            user_id: userId, action: "register", xp_amount: 100,
          });
        } catch {}

        // Send welcome email
        const { data: profile } = await admin
          .from("profiles").select("full_name").eq("id", userId).single();
        const { sendWelcomeEmail } = await import("@/lib/email/resend");
        await sendWelcomeEmail(
          data.user.email || "",
          profile?.full_name || "bạn"
        ).catch(() => {});
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Link xác thực không hợp lệ hoặc đã hết hạn.")}`
  );
}
