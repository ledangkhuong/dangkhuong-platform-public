"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkRateLimit, recordFailedAttempt, resetRateLimit, rateLimit } from "@/lib/rate-limit";

export async function signUp(formData: FormData) {
  // Rate limit: 5 requests per 60 seconds per IP (matches API route)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimitResult = await rateLimit(`register:${ip}`, 5, 60);
  if (!rateLimitResult.allowed) {
    redirect("/register?error=" + encodeURIComponent("Quá nhiều yêu cầu. Vui lòng thử lại sau."));
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const full_name = formData.get("full_name") as string;
  const phone = (formData.get("phone") as string)?.replace(/\s+/g, "");

  // Validate required fields
  if (!full_name?.trim()) redirect("/register?error=" + encodeURIComponent("Vui lòng nhập họ và tên"));
  if (!phone || !/^(0|\+84)[0-9]{9}$/.test(phone)) redirect("/register?error=" + encodeURIComponent("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số (VD: 0912345678)"));
  if (!email?.trim()) redirect("/register?error=" + encodeURIComponent("Vui lòng nhập email"));
  if (!password || password.length < 8) redirect("/register?error=" + encodeURIComponent("Mật khẩu phải có ít nhất 8 ký tự"));
  if (password.length > 72) redirect("/register?error=" + encodeURIComponent("Mật khẩu không được quá 72 ký tự"));

  const admin = await createAdminClient();

  // Create user WITHOUT auto-confirming email
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name },
  });
  if (createError) redirect(`/register?error=${encodeURIComponent(createError.message)}`);

  // Save phone to profile immediately (using admin client to bypass RLS)
  if (created?.user) {
    await admin.from("profiles").update({ phone }).eq("id", created.user.id);
  }

  // GDPR/PDPA: Only add to subscribers/newsletter if user explicitly opted in.
  // The registration form must send newsletter_opt_in=true for this to run.
  const newsletterOptIn = formData.get("newsletter_opt_in") === "true";
  if (created?.user && newsletterOptIn) {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check if email already exists in subscribers (e.g. from newsletter signup)
      const { data: existingSub } = await admin
        .from("subscribers")
        .select("id, user_id")
        .eq("email", normalizedEmail)
        .single();

      if (existingSub) {
        // Link existing subscriber to this user if not already linked
        if (!existingSub.user_id) {
          await admin
            .from("subscribers")
            .update({
              user_id: created.user.id,
              full_name: full_name || undefined,
              phone: phone || undefined,
              tags: ["registered_user", "newsletter"],
              source: "website_registration",
            })
            .eq("id", existingSub.id);
        }
      } else {
        // Insert new subscriber
        const { data: newSub } = await admin
          .from("subscribers")
          .insert({
            email: normalizedEmail,
            full_name: full_name || null,
            phone: phone || null,
            status: "active",
            source: "website_registration",
            tags: ["registered_user"],
            user_id: created.user.id,
            subscribed_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        // Add to newsletter list if one exists (best-effort)
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
    } catch (subError) {
      // Don't fail registration if subscriber sync fails
      console.error("Failed to sync subscriber on signup:", subError);
    }
  }

  // Generate confirmation link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
  });

  if (!linkError && linkData) {
    // Send Vietnamese confirmation email via Resend
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
    const confirmUrl = `${baseUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=signup&next=/dashboard`;

    const { sendVerificationEmail } = await import("@/lib/email/transactional");
    await sendVerificationEmail(email, full_name, confirmUrl).catch((err) => console.error("[Auth] Verification email failed:", err));
  }

  redirect("/register/verify?email=" + encodeURIComponent(email));
}

export async function signIn(formData: FormData) {
  // Rate limit check
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const rateCheck = await checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return `/login?error=${encodeURIComponent("Quá nhiều lần thử. Vui lòng đợi " + Math.ceil(rateCheck.retryAfterSec / 60) + " phút.")}`;
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    await recordFailedAttempt(ip);
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  await resetRateLimit(ip);

  // Cập nhật last_login (dùng admin client để bypass RLS)
  const userId = signInData?.user?.id;
  if (userId) {
    const admin = await createAdminClient();
    await admin.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", userId);
    await admin.from("xp_events").insert({ user_id: userId, action: "login", xp_amount: 10 });
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();
  return { ...user, profile };
}

/** Escape the five HTML special characters to prevent stored XSS. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── full_name ──────────────────────────────────────────────────────────────
  const rawFullName = (formData.get("full_name") as string | null) ?? "";
  const full_name = rawFullName.trim();
  if (!full_name) {
    redirect("/settings?error=" + encodeURIComponent("Vui lòng nhập họ và tên"));
  }
  if (full_name.length > 100) {
    redirect("/settings?error=" + encodeURIComponent("Họ và tên không được vượt quá 100 ký tự"));
  }

  // ── phone ──────────────────────────────────────────────────────────────────
  // Optional field; validate only when a non-empty value is supplied.
  const rawPhone = (formData.get("phone") as string | null) ?? "";
  const phone = rawPhone.replace(/\s+/g, "");
  if (phone) {
    // Vietnamese local format: 10 digits starting with 0, or 11-digit variant
    // International format: +84 followed by 9-10 digits
    const viLocal = /^0\d{9,10}$/;
    const viIntl  = /^\+84\d{9,10}$/;
    if (!viLocal.test(phone) && !viIntl.test(phone)) {
      redirect(
        "/settings?error=" +
          encodeURIComponent(
            "Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng (VD: 0912345678 hoặc +84912345678)"
          )
      );
    }
  }

  // ── bio ────────────────────────────────────────────────────────────────────
  const rawBio = (formData.get("bio") as string | null) ?? "";
  const bio = rawBio.trim();
  if (bio.length > 500) {
    redirect("/settings?error=" + encodeURIComponent("Giới thiệu bản thân không được vượt quá 500 ký tự"));
  }

  // ── sanitise against stored XSS ───────────────────────────────────────────
  const safeName  = escapeHtml(full_name);
  const safePhone = phone ? escapeHtml(phone) : null;
  const safeBio   = bio   ? escapeHtml(bio)   : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: safeName,
      phone: safePhone,
      bio: safeBio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  redirect("/settings?saved=1");
}

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const admin = await createAdminClient();

    // Delete user data in order that respects foreign key constraints.
    // Each step is wrapped individually so one missing table doesn't block the rest.

    // 0. GDPR/PDPA: Delete subscriber data (must come before profile deletion)
    try {
      const userEmail = user.email;
      if (userEmail) {
        // Delete subscriber_list_members first (foreign key to subscribers)
        const { data: subscriber } = await admin
          .from("subscribers")
          .select("id")
          .eq("email", userEmail)
          .single();
        if (subscriber) {
          await admin.from("subscriber_list_members").delete().eq("subscriber_id", subscriber.id);
        }
        // Then delete the subscriber record itself
        await admin.from("subscribers").delete().eq("email", userEmail);
      }
    } catch {}

    // 1. Delete user's enrollments
    try { await admin.from("enrollments").delete().eq("user_id", user.id); } catch {}

    // 2. Delete user's orders
    try { await admin.from("orders").delete().eq("user_id", user.id); } catch {}

    // 3. Delete user's xp_events
    try { await admin.from("xp_events").delete().eq("user_id", user.id); } catch {}

    // 4. Delete user's community comments before posts (comments reference posts)
    try { await admin.from("comments").delete().eq("user_id", user.id); } catch {}
    try { await admin.from("posts").delete().eq("user_id", user.id); } catch {}

    // 5. Delete user's lesson progress
    try { await admin.from("lesson_progress").delete().eq("user_id", user.id); } catch {}

    // 6. Delete user's notifications
    try { await admin.from("notifications").delete().eq("user_id", user.id); } catch {}

    // 7. Delete user's profile
    try { await admin.from("profiles").delete().eq("id", user.id); } catch {}

    // 8. Delete auth user (this also invalidates their session)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return { success: false, error: "Không thể xóa tài khoản. Vui lòng thử lại." };
    }

    return { success: true };
  } catch (err) {
    console.error("Delete account error:", err);
    return { success: false, error: "Có lỗi xảy ra. Vui lòng thử lại." };
  }
}
