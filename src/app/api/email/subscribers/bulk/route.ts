import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// POST /api/email/subscribers/bulk — bulk actions on subscribers
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, subscriber_ids, list_id, status, tags } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    if (!subscriber_ids || !Array.isArray(subscriber_ids) || subscriber_ids.length === 0) {
      return NextResponse.json(
        { error: "subscriber_ids must be a non-empty array" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();
    let affected = 0;

    switch (action) {
      case "delete": {
        const { count, error } = await admin
          .from("subscribers")
          .delete({ count: "exact" })
          .in("id", subscriber_ids);

        if (error)
          return NextResponse.json({ error: error.message }, { status: 500 });

        affected = count || 0;
        break;
      }

      case "add_to_list": {
        if (!list_id) {
          return NextResponse.json(
            { error: "list_id is required for add_to_list action" },
            { status: 400 }
          );
        }

        const listMembers = subscriber_ids.map((subId: string) => ({
          subscriber_id: subId,
          list_id,
          added_at: new Date().toISOString(),
        }));

        const { error } = await admin
          .from("subscriber_list_members")
          .upsert(listMembers, {
            onConflict: "subscriber_id,list_id",
            ignoreDuplicates: true,
          });

        if (error)
          return NextResponse.json({ error: error.message }, { status: 500 });

        affected = subscriber_ids.length;
        break;
      }

      case "remove_from_list": {
        if (!list_id) {
          return NextResponse.json(
            { error: "list_id is required for remove_from_list action" },
            { status: 400 }
          );
        }

        const { count, error } = await admin
          .from("subscriber_list_members")
          .delete({ count: "exact" })
          .eq("list_id", list_id)
          .in("subscriber_id", subscriber_ids);

        if (error)
          return NextResponse.json({ error: error.message }, { status: 500 });

        affected = count || 0;
        break;
      }

      case "update_status": {
        if (!status) {
          return NextResponse.json(
            { error: "status is required for update_status action" },
            { status: 400 }
          );
        }

        const validStatuses = ["active", "unsubscribed", "bounced", "complained"];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { error: `status must be one of: ${validStatuses.join(", ")}` },
            { status: 400 }
          );
        }

        const updateData: Record<string, unknown> = {
          status,
          updated_at: new Date().toISOString(),
        };

        if (status === "unsubscribed") {
          updateData.unsubscribed_at = new Date().toISOString();
        }

        const { count, error } = await admin
          .from("subscribers")
          .update(updateData, { count: "exact" })
          .in("id", subscriber_ids);

        if (error)
          return NextResponse.json({ error: error.message }, { status: 500 });

        affected = count || 0;
        break;
      }

      case "add_tags": {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return NextResponse.json(
            { error: "tags must be a non-empty array for add_tags action" },
            { status: 400 }
          );
        }

        // Fetch current tags for each subscriber, merge, then update
        const { data: subscribers, error: fetchError } = await admin
          .from("subscribers")
          .select("id, tags")
          .in("id", subscriber_ids);

        if (fetchError)
          return NextResponse.json(
            { error: fetchError.message },
            { status: 500 }
          );

        let updateCount = 0;
        for (const sub of subscribers || []) {
          const currentTags: string[] = sub.tags || [];
          const newTags = [...new Set([...currentTags, ...tags])];

          const { error: updateError } = await admin
            .from("subscribers")
            .update({
              tags: newTags,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.id);

          if (!updateError) updateCount++;
        }

        affected = updateCount;
        break;
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action '${action}'. Valid actions: delete, add_to_list, remove_from_list, update_status, add_tags`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, affected });
  } catch (err) {
    console.error("POST /api/email/subscribers/bulk error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
