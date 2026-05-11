import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If this is a password recovery flow, redirect to reset-password page
      if (next === "/reset-password") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if this is an OAuth user (Google/Facebook)
        const isOAuth = user.app_metadata?.provider !== "email"
          && user.app_metadata?.providers?.some((p: string) => ["google", "facebook"].includes(p));

        if (isOAuth) {
          const adminClient = await createAdminClient();

          // Sync OAuth user to subscribers table (best-effort)
          if (user.email) {
            try {
              const normalizedEmail = user.email.toLowerCase();
              const meta = user.user_metadata;
              const oauthFullName = meta?.full_name || meta?.name || null;

              const { data: existingSub } = await adminClient
                .from("subscribers")
                .select("id, user_id")
                .eq("email", normalizedEmail)
                .single();

              if (existingSub) {
                // Link existing subscriber to this user if not already linked
                if (!existingSub.user_id) {
                  await adminClient
                    .from("subscribers")
                    .update({ user_id: user.id })
                    .eq("id", existingSub.id);
                }
              } else {
                // Insert new subscriber for this OAuth user
                const { data: newSub } = await adminClient
                  .from("subscribers")
                  .insert({
                    email: normalizedEmail,
                    full_name: oauthFullName,
                    status: "active",
                    source: "website_registration",
                    tags: ["registered_user"],
                    user_id: user.id,
                    subscribed_at: user.created_at || new Date().toISOString(),
                  })
                  .select("id")
                  .single();

                // Add to newsletter list if one exists (best-effort)
                if (newSub) {
                  const { data: defaultList } = await adminClient
                    .from("email_lists")
                    .select("id")
                    .ilike("name", "%newsletter%")
                    .limit(1)
                    .single();

                  if (defaultList) {
                    await adminClient
                      .from("subscriber_list_members")
                      .upsert(
                        {
                          subscriber_id: newSub.id,
                          list_id: defaultList.id,
                          added_at: new Date().toISOString(),
                        },
                        { onConflict: "subscriber_id,list_id", ignoreDuplicates: true }
                      );
                  }
                }
              }
            } catch (subError) {
              // Don't fail OAuth login if subscriber sync fails
              console.error("Failed to sync subscriber on OAuth login:", subError);
            }
          }

          // Check if profile exists
          const { data: profile } = await adminClient
            .from("profiles")
            .select("id, phone, full_name, avatar_url")
            .eq("id", user.id)
            .single();

          if (profile) {
            // Profile exists — update avatar/name from OAuth if missing
            const updates: Record<string, string> = {};
            const meta = user.user_metadata;

            if (!profile.full_name && meta?.full_name) {
              updates.full_name = meta.full_name;
            }
            if (!profile.avatar_url && (meta?.avatar_url || meta?.picture)) {
              updates.avatar_url = meta.avatar_url || meta.picture;
            }

            if (Object.keys(updates).length > 0) {
              await adminClient
                .from("profiles")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", user.id);
            }

            // Update last_login
            await adminClient
              .from("profiles")
              .update({ last_login: new Date().toISOString() })
              .eq("id", user.id);

            // Award login XP
            await adminClient
              .from("xp_events")
              .insert({ user_id: user.id, action: "login", xp_amount: 10 });

            // If no phone → redirect to complete profile
            if (!profile.phone) {
              return NextResponse.redirect(`${origin}/complete-profile`);
            }
          } else {
            // Profile doesn't exist yet (trigger may not have fired) — create it
            const meta = user.user_metadata;
            await adminClient.from("profiles").upsert({
              id: user.id,
              full_name: meta?.full_name || meta?.name || "",
              avatar_url: meta?.avatar_url || meta?.picture || null,
              email: user.email,
              role: "student",
              tier: "free",
              xp: 0,
              last_login: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            // Award login XP
            await adminClient
              .from("xp_events")
              .insert({ user_id: user.id, action: "login", xp_amount: 10 });

            // New user — always needs phone
            return NextResponse.redirect(`${origin}/complete-profile`);
          }
        } else {
          // Regular email user — update last_login + XP
          await supabase
            .from("profiles")
            .update({ last_login: new Date().toISOString() })
            .eq("id", user.id);
          await supabase
            .from("xp_events")
            .insert({ user_id: user.id, action: "login", xp_amount: 10 });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Nếu lỗi, redirect về login với error message
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Xác thực thất bại. Vui lòng thử lại.")}`
  );
}
