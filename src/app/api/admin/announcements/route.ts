import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/ses";
import { announcementEmailHtml } from "@/lib/email/templates/announcement";

// GET /api/admin/announcements — list announcements
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = await createAdminClient();

  const { data, error } = await adminClient
    .from("posts")
    .select(`*, profiles!posts_user_id_fkey(full_name, avatar_url)`)
    .eq("is_announcement", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Announcements GET] Error:", error.message);
    return NextResponse.json(
      { error: "Không thể tải thông báo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ announcements: data });
}

// POST /api/admin/announcements — create announcement + optionally email students
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin or manager role
  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!["admin", "manager"].includes(profile?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { content, send_email, category } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  // Create announcement post
  const { data: post, error: postError } = await adminClient
    .from("posts")
    .insert({
      user_id: user.id,
      content: content.trim(),
      category: category || "announcement",
      is_announcement: true,
      pinned: true,
    })
    .select(`*, profiles!posts_user_id_fkey(full_name, avatar_url)`)
    .single();

  if (postError) {
    console.error("[Announcements POST] Create error:", postError.message);
    return NextResponse.json(
      { error: "Không thể tạo thông báo." },
      { status: 500 }
    );
  }

  let emailsQueued = 0;

  if (send_email) {
    // Query all student profiles that have an email via auth.users
    const { data: students, error: studentsError } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .eq("role", "student");

    if (studentsError) {
      console.error("[Announcements POST] Fetch students error:", studentsError.message);
    } else if (students && students.length > 0) {
      // Get emails from auth.users for these student IDs
      const { data: authUsers, error: authError } = await adminClient
        .auth.admin.listUsers({ perPage: 1000 });

      if (authError) {
        console.error("[Announcements POST] Fetch auth users error:", authError.message);
      } else {
        const studentIds = new Set(students.map((s) => s.id));
        const studentNameMap = new Map(students.map((s) => [s.id, s.full_name]));

        const recipientEmails = (authUsers?.users ?? [])
          .filter((u) => studentIds.has(u.id) && u.email)
          .map((u) => ({ id: u.id, email: u.email! }));

        emailsQueued = recipientEmails.length;

        const siteName = process.env.EMAIL_FROM_NAME || "Le Dang Khuong Academy";
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dangkhuong.com";
        const htmlBody = announcementEmailHtml(content.trim(), siteName, baseUrl);
        const subject = `${siteName} — Thong bao moi`;

        // Fire and forget — send in batches of 50 with error logging
        const batchSize = 50;
        for (let i = 0; i < recipientEmails.length; i += batchSize) {
          const batch = recipientEmails.slice(i, i + batchSize);
          // Don't await — fire and forget
          Promise.allSettled(
            batch.map((r) =>
              sendEmail(r.email, subject, htmlBody).catch((err) =>
                console.error(
                  `[Announcements] Email failed for ${r.email}:`,
                  err
                )
              )
            )
          ).catch((err) =>
            console.error("[Announcements] Batch email error:", err)
          );
        }
      }
    }
  }

  return NextResponse.json({ post, emails_queued: emailsQueued });
}
