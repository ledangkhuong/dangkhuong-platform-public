import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/email/sync-users — sync all registered auth users into the subscribers table
export async function POST() {
  try {
    // 1. Require admin auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: admin role required" }, { status: 403 });
    }

    // Rate limit: 1 sync per hour per user
    const rl = await rateLimit(`sync-users:${user.id}`, 1, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec: rl.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    // 2. Use admin client to list all auth users
    const admin = await createAdminClient();

    // Fetch all auth users (paginate in case there are many)
    const allUsers: Array<{
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
      created_at: string;
    }> = [];
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error("[Email SyncUsers] Failed to list users:", error);
        return NextResponse.json(
          { error: "Có lỗi xảy ra khi đồng bộ người dùng. Vui lòng thử lại." },
          { status: 500 }
        );
      }

      if (!data?.users || data.users.length === 0) break;
      allUsers.push(...data.users);

      // If we got fewer than perPage, we've reached the end
      if (data.users.length < perPage) break;
      page++;
    }

    // 3. Get all existing subscribers (email + user_id) for quick lookup
    const { data: existingSubscribers, error: subError } = await admin
      .from("subscribers")
      .select("id, email, user_id");

    if (subError) {
      console.error("[Email SyncUsers] Failed to fetch subscribers:", subError);
      return NextResponse.json(
        { error: "Có lỗi xảy ra khi đồng bộ người dùng. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    const subscriberByEmail = new Map<string, { id: string; user_id: string | null }>();
    for (const sub of existingSubscribers || []) {
      subscriberByEmail.set(sub.email?.toLowerCase(), {
        id: sub.id,
        user_id: sub.user_id,
      });
    }

    // 4. Get profiles for all users (for phone numbers and full_name fallback)
    const userIds = allUsers.map((u) => u.id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);

    const profileById = new Map<string, { full_name: string | null; phone: string | null }>();
    for (const p of profiles || []) {
      profileById.set(p.id, { full_name: p.full_name, phone: p.phone });
    }

    // 5. Find the newsletter list for adding synced users (best-effort)
    const { data: newsletterList } = await admin
      .from("email_lists")
      .select("id")
      .ilike("name", "%newsletter%")
      .limit(1)
      .single();

    // 6. Process each user
    let synced = 0;
    let skipped = 0;
    let linked = 0;
    let errors = 0;

    for (const authUser of allUsers) {
      const email = authUser.email?.toLowerCase();
      if (!email) {
        skipped++;
        continue;
      }

      const existing = subscriberByEmail.get(email);
      const profile = profileById.get(authUser.id);
      const fullName =
        (authUser.user_metadata?.full_name as string) ||
        (authUser.user_metadata?.name as string) ||
        profile?.full_name ||
        null;

      if (existing) {
        if (!existing.user_id) {
          // Link existing subscriber to auth user
          const { error: updateError } = await admin
            .from("subscribers")
            .update({ user_id: authUser.id })
            .eq("id", existing.id);

          if (updateError) {
            console.error(`Error linking subscriber ${email}:`, updateError.message);
            errors++;
          } else {
            linked++;
          }
        } else {
          skipped++;
        }
        continue;
      }

      // Insert new subscriber
      const { data: newSub, error: insertError } = await admin
        .from("subscribers")
        .insert({
          email,
          full_name: fullName,
          phone: profile?.phone || null,
          status: "active",
          source: "website_registration",
          tags: ["registered_user"],
          user_id: authUser.id,
          subscribed_at: authUser.created_at,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Error inserting subscriber ${email}:`, insertError.message);
        errors++;
        continue;
      }

      synced++;

      // Add to newsletter list (best-effort)
      if (newsletterList && newSub) {
        await admin
          .from("subscriber_list_members")
          .upsert(
            {
              subscriber_id: newSub.id,
              list_id: newsletterList.id,
              added_at: new Date().toISOString(),
            },
            { onConflict: "subscriber_id,list_id", ignoreDuplicates: true }
          );
      }
    }

    // Update newsletter list subscriber_count if we added anyone
    if (newsletterList && synced > 0) {
      const { count } = await admin
        .from("subscriber_list_members")
        .select("*", { count: "exact", head: true })
        .eq("list_id", newsletterList.id);

      await admin
        .from("email_lists")
        .update({
          subscriber_count: count ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", newsletterList.id);
    }

    return NextResponse.json({
      message: "User sync completed",
      total_auth_users: allUsers.length,
      synced,
      skipped,
      linked,
      errors,
    });
  } catch (err) {
    console.error("POST /api/email/sync-users error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
