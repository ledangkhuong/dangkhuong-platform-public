"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: { full_name: formData.get("full_name") as string },
    },
  });
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  // Auto-enroll vào khoá học miễn phí
  const phone = formData.get("phone") as string;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Save phone number to profile
    await supabase.from("profiles").update({ phone }).eq("id", user.id);
    const { data: freeProduct } = await supabase
      .from("products").select("id").eq("price", 0).single();
    if (freeProduct) {
      await supabase.from("enrollments").insert({
        user_id: user.id, product_id: freeProduct.id, source: "free",
      });
    }
    // Thêm XP đăng ký
    await supabase.from("xp_events").insert({
      user_id: user.id, action: "register", xp_amount: 100,
    });
    // Gửi email chào mừng
    const { sendWelcomeEmail } = await import("@/lib/email/resend");
    const emailName = formData.get("full_name") as string || "bạn";
    const emailAddr = formData.get("email") as string;
    await sendWelcomeEmail(emailAddr, emailName).catch(() => {}); // không throw nếu email lỗi
  }
  redirect("/dashboard");
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
