import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = await rateLimit(`register:${ip}`, 5, 60);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfterSec) } }
      );
    }

    const { email, password, full_name, phone, newsletter_opt_in } = await req.json();

    // Validate
    if (!full_name?.trim()) return NextResponse.json({ error: "Vui lòng nhập họ và tên" }, { status: 400 });
    if (!phone || !/^(0|\+84)[0-9]{9}$/.test(phone.replace(/\s+/g, "")))
      return NextResponse.json({ error: "Số điện thoại không hợp lệ" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Vui lòng nhập email" }, { status: 400 });

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
    }

    // Max length validation
    if (full_name.trim().length > 100) return NextResponse.json({ error: "Tên quá dài" }, { status: 400 });
    if (email.trim().length > 254) return NextResponse.json({ error: "Email quá dài" }, { status: 400 });

    // Password policy — chỉ yêu cầu tối thiểu 8 ký tự
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 8 ký tự" }, { status: 400 });
    }
    if (password.length > 72) {
      return NextResponse.json({ error: "Mật khẩu không được quá 72 ký tự" }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\s+/g, "");
    const admin = await createAdminClient();

    // Create user
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name },
    });
    if (createError) {
      console.error("[Register] Create user error:", createError.message);
      return NextResponse.json({ error: "Không thể tạo tài khoản. Vui lòng thử email khác." }, { status: 400 });
    }

    // Save phone
    if (created?.user) {
      await admin.from("profiles").update({ phone: cleanPhone }).eq("id", created.user.id);
    }

    // GDPR/PDPA: Only sync subscriber if user explicitly opted in to newsletter
    if (created?.user && newsletter_opt_in === true) {
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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
        const confirmUrl = `${baseUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=signup&next=/dashboard`;
        const { sendVerificationEmail } = await import("@/lib/email/transactional");
        await sendVerificationEmail(email, full_name, confirmUrl);
        emailSent = true;
      }
    } catch (emailErr) {
      console.error("[Register] Email send failed:", emailErr instanceof Error ? emailErr.message : emailErr);
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (err) {
    console.error("Register API error:", err);
    return NextResponse.json({ error: "Có lỗi xảy ra. Vui lòng thử lại." }, { status: 500 });
  }
}
