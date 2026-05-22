import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/admin/enrollments/bulk
 * Body: { emails: string[], product_ids: string[] }
 * Grants course access to multiple emails at once.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager", "sale"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await rateLimit(`bulk-enroll:${user.id}`, 5, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const { emails, product_ids } = await req.json();

  if (
    !emails ||
    !Array.isArray(emails) ||
    emails.length === 0 ||
    !product_ids ||
    !Array.isArray(product_ids) ||
    product_ids.length === 0
  ) {
    return NextResponse.json(
      { error: "emails[] and product_ids[] required" },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Build email → userId map by paginating through auth users
  const emailToUserId: Record<string, string> = {};
  const normalizedEmails = new Set(
    emails.map((e: string) => e.trim().toLowerCase()).filter(Boolean)
  );

  let page = 1;
  const perPage = 500;
  while (normalizedEmails.size > Object.keys(emailToUserId).length) {
    const {
      data: { users },
    } = await admin.auth.admin.listUsers({ page, perPage });
    if (!users || users.length === 0) break;

    for (const u of users) {
      const ue = u.email?.toLowerCase();
      if (ue && normalizedEmails.has(ue)) {
        emailToUserId[ue] = u.id;
      }
    }

    if (users.length < perPage) break;
    page++;
  }

  // Categorize results
  const notFound: string[] = [];
  const granted: string[] = [];
  const alreadyEnrolled: string[] = [];
  const failed: string[] = [];

  for (const rawEmail of normalizedEmails) {
    const userId = emailToUserId[rawEmail];
    if (!userId) {
      notFound.push(rawEmail);
      continue;
    }

    // Check existing enrollments for this user
    const { data: existing } = await admin
      .from("enrollments")
      .select("product_id")
      .eq("user_id", userId)
      .in("product_id", product_ids);

    const existingSet = new Set((existing ?? []).map((e) => e.product_id));
    const newProductIds = product_ids.filter(
      (pid: string) => !existingSet.has(pid)
    );

    if (newProductIds.length === 0) {
      alreadyEnrolled.push(rawEmail);
      continue;
    }

    // Insert enrollments
    const rows = newProductIds.map((pid: string) => ({
      user_id: userId,
      product_id: pid,
      source: "admin" as const,
    }));

    const { error } = await admin.from("enrollments").insert(rows);

    if (error) {
      console.error(`[Bulk Grant] Error for ${rawEmail}:`, error.message);
      failed.push(rawEmail);
    } else {
      granted.push(rawEmail);
    }
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (granted.length > 0) {
    await logAudit({
      admin_id: user.id,
      action: "enrollment.create",
      target_type: "enrollment",
      target_id: "bulk",
      details: { emails: granted, product_ids, total: granted.length },
      ip_address: ip,
    });
  }

  return NextResponse.json({
    success: true,
    total: normalizedEmails.size,
    granted,
    alreadyEnrolled,
    notFound,
    failed,
  });
}
