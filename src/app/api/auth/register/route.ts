import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, phone, turnstile_token } = await req.json();

    // Verify Turnstile CAPTCHA
    const turnstileOk = await verifyTurnstile(turnstile_token);
    if (!turnstileOk) {
      return NextResponse.json({ error: "Xác minh CAPTCHA thất bại. Vui lòng thử lại." }, { status: 400 });
    }

    // Validate
    if (!full_name?.trim()) return NextResponse.json({ error: "Vui lòng nhập họ và tên" }, { status: 400 });
    if (!phone || !/^(0|\+84)[0-9]{9}$/.test(phone.replace(/\s+/g, "")))
      return NextResponse.json({ error: "Số điện thoại không hợp lệ" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Vui lòng nhập email" }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự" }, { status: 400 });

    const cleanPhone = phone.replace(/\s+/g, "");
    const admin = await createAdminClient();

    // Create user
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name },
    });
    if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });

    // Save phone
    if (created?.user) {
      await admin.from("profiles").update({ phone: cleanPhone }).eq("id", created.user.id);
    }

    // Sync subscriber (best-effort)
    if (created?.user) {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: existingSub } = await admin
          .from("subscribers")
          .select("id, user_id")
          .eq("email", normalizedEmail)
          .single();

        if (existingSub) {
          if (!existingSub.user_id) {
            await admin.from("subscribers").update({
              user_id: created.user.id,
              full_name: full_name || undefined,
              phone: cleanPhone || undefined,
              tags: ["registered_user", "newsletter"],
              source: "website_registration",
            }).eq("id", existingSub.id);
          }
        } else {
          const { data: newSub } = await admin.from("subscribers").insert({
            email: normalizedEmail,
            full_name: full_name || null,
            phone: cleanPhone || null,
            status: "active",
            source: "website_registration",
            tags: ["registered_user"],
            user_id: created.user.id,
            subscribed_at: new Date().toISOString(),
          }).select("id").single();

          if (newSub) {
            const { data: defaultList } = await admin
              .from("email_lists")
              .select("id")
              .ilike("name", "%newsletter%")
              .limit(1)
              .single();
            if (defaultList) {
              await admin.from("subscriber_list_members").insert({
                subscriber_id: newSub.id,
                list_id: defaultList.id,
                added_at: new Date().toISOString(),
              });
            }
          }
        }
      } catch (e) {
        console.error("Subscriber sync error:", e);
      }
    }

    // Send verification email
    let emailSent = false;
    try {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
      });

      if (linkError) {
        console.error("[Register] generateLink error:", linkError.message);
      } else if (linkData) {
        const confirmUrl = `https://dangkhuong.com/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=signup&next=/dashboard`;
        console.log("[Register] Sending verification email to:", email);
        const { sendVerificationEmail } = await import("@/lib/email/resend");
        const result = await sendVerificationEmail(email, full_name, confirmUrl);
        console.log("[Register] Email sent result:", JSON.stringify(result));
        emailSent = true;
      }
    } catch (emailErr) {
      console.error("[Register] Email send failed:", emailErr instanceof Error ? emailErr.message : emailErr);
    }

    return NextResponse.json({ success: true, email, emailSent });
  } catch (err) {
    console.error("Register API error:", err);
    return NextResponse.json({ error: "Có lỗi xảy ra. Vui lòng thử lại." }, { status: 500 });
  }
}
