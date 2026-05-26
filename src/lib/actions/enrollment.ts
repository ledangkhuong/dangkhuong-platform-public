"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Admin cấp quyền khoá học cho học viên (hỗ trợ tìm bằng email hoặc SĐT) */
export async function grantCourseAccess(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check admin/manager/sale role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "sale"].includes(profile.role)) redirect("/dashboard");

  const identifier = (formData.get("identifier") as string || "").trim();
  const productIds = formData.getAll("product_ids") as string[];

  if (!identifier || productIds.length === 0) {
    redirect("/admin/enrollments?error=missing_fields");
  }

  const admin = await createAdminClient();
  const isEmail = identifier.includes("@");

  // ── Find user by email or phone ──
  let targetUser: { id: string; email?: string } | null = null;

  if (isEmail) {
    // 1. Try fast lookup via profiles table
    const email = identifier.toLowerCase();
    const { data: profileMatch } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (profileMatch) {
      targetUser = { id: profileMatch.id, email: profileMatch.email ?? undefined };
    } else {
      // 2. Fallback: scan auth users (for users without a profile row)
      let page = 1;
      const perPage = 500;
      while (true) {
        const { data: { users } } = await admin.auth.admin.listUsers({ page, perPage });
        if (!users || users.length === 0) break;
        const found = users.find(u => u.email?.toLowerCase() === email);
        if (found) { targetUser = found; break; }
        if (users.length < perPage) break;
        page++;
      }
    }
  } else {
    // Phone lookup: normalize and search profiles, then orders
    const phone = identifier.replace(/[\s\-().]/g, "");

    // Try profiles table
    const { data: profileMatch } = await admin
      .from("profiles")
      .select("id, email")
      .eq("phone", phone)
      .maybeSingle();

    if (profileMatch) {
      targetUser = { id: profileMatch.id, email: profileMatch.email ?? undefined };
    } else {
      // Fallback: find email via orders table, then look up user
      const { data: orderMatch } = await admin
        .from("orders")
        .select("customer_email")
        .eq("customer_phone", phone)
        .limit(1)
        .maybeSingle();

      if (orderMatch?.customer_email) {
        const { data: profileByEmail } = await admin
          .from("profiles")
          .select("id, email")
          .eq("email", orderMatch.customer_email.toLowerCase())
          .maybeSingle();
        if (profileByEmail) {
          targetUser = { id: profileByEmail.id, email: profileByEmail.email ?? undefined };
        }
      }
    }
  }

  if (!targetUser) {
    redirect("/admin/enrollments?error=user_not_found");
  }

  // Check which courses are already enrolled
  const { data: existingEnrollments } = await admin
    .from("enrollments")
    .select("product_id")
    .eq("user_id", targetUser.id)
    .in("product_id", productIds);

  const alreadyEnrolledIds = new Set((existingEnrollments ?? []).map(e => e.product_id));
  const newProductIds = productIds.filter(id => !alreadyEnrolledIds.has(id));

  if (newProductIds.length === 0) {
    redirect("/admin/enrollments?error=already_enrolled");
  }

  // Grant access for all new courses
  const rows = newProductIds.map(pid => ({
    user_id: targetUser.id,
    product_id: pid,
    source: "admin" as const,
  }));

  const { error } = await admin.from("enrollments").insert(rows);

  if (error) {
    console.error("[Grant Access]", error);
    redirect("/admin/enrollments?error=failed");
  }

  const skipped = alreadyEnrolledIds.size;
  const grantedCount = newProductIds.length;
  redirect(`/admin/enrollments?granted=${grantedCount}${skipped > 0 ? `&skipped=${skipped}` : ""}`);
}

/** Admin thu hồi quyền khoá học */
export async function revokeCourseAccess(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "sale"].includes(profile.role)) redirect("/dashboard");

  const enrollmentId = formData.get("enrollment_id") as string;
  if (!enrollmentId) redirect("/admin/enrollments");

  const admin = await createAdminClient();
  const { error } = await admin.from("enrollments").delete().eq("id", enrollmentId);

  if (error) {
    console.error("[Revoke Access]", error);
    redirect("/admin/enrollments?error=revoke_failed");
  }

  redirect("/admin/enrollments?revoked=1");
}
