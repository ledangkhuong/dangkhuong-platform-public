"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const full_name = formData.get("full_name") as string;
  const phone = (formData.get("phone") as string)?.replace(/\s+/g, "");

  // Validate required fields
  if (!full_name?.trim()) redirect("/register?error=" + encodeURIComponent("Vui lòng nhập họ và tên"));
  if (!phone || !/^(0|\+84)[0-9]{9}$/.test(phone)) redirect("/register?error=" + encodeURIComponent("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số (VD: 0912345678)"));
  if (!email?.trim()) redirect("/register?error=" + encodeURIComponent("Vui lòng nhập email"));
  if (!password || password.length < 8) redirect("/register?error=" + encodeURIComponent("Mật khẩu phải có ít nhất 8 ký tự"));

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

  // Generate confirmation link
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
  });

  if (!linkError && linkData) {
    // Send Vietnamese confirmation email via Resend
    const confirmUrl = `https://dangkhuong.com/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=signup&next=/dashboard`;

    const { sendVerificationEmail } = await import("@/lib/email/resend");
    await sendVerificationEmail(email, full_name, confirmUrl).catch(() => {});
  }

  redirect("/register/verify?email=" + encodeURIComponent(email));
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  // Cập nhật last_login
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", user.id);
    await supabase.from("xp_events").insert({ user_id: user.id, action: "login", xp_amount: 10 });
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

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = formData.get("full_name") as string;
  const phone = formData.get("phone") as string;
  const bio = formData.get("bio") as string;

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone, bio, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  redirect("/settings?saved=1");
}
