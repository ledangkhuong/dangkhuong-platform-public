import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { subscriber_id, action, tags } = body;

  if (!subscriber_id || !action || !tags || !Array.isArray(tags)) {
    return NextResponse.json(
      { error: "Missing required fields: subscriber_id, action, tags" },
      { status: 400 }
    );
  }

  if (!["add", "remove"].includes(action)) {
    return NextResponse.json(
      { error: "Action must be 'add' or 'remove'" },
      { status: 400 }
    );
  }

  const admin = await createAdminClient();

  // Fetch current subscriber
  const { data: subscriber, error: fetchError } = await admin
    .from("subscribers")
    .select("id, tags")
    .eq("id", subscriber_id)
    .single();

  if (fetchError || !subscriber) {
    return NextResponse.json(
      { error: "Subscriber not found" },
      { status: 404 }
    );
  }

  let updatedTags: string[];
  const currentTags: string[] = subscriber.tags || [];

  if (action === "add") {
    // Merge and deduplicate
    const mergedSet = new Set([...currentTags, ...tags]);
    updatedTags = Array.from(mergedSet);
  } else {
    // Remove specified tags
    const tagsToRemove = new Set(tags);
    updatedTags = currentTags.filter((tag: string) => !tagsToRemove.has(tag));
  }

  // Update subscriber tags
  const { error: updateError } = await admin
    .from("subscribers")
    .update({ tags: updatedTags })
    .eq("id", subscriber_id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update tags" },
      { status: 500 }
    );
  }

  // Update tag subscriber counts
  await admin.rpc("update_tag_subscriber_counts");

  return NextResponse.json({
    subscriber: {
      id: subscriber_id,
      tags: updatedTags,
    },
  });
}
