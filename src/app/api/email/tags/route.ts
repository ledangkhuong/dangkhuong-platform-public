import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Auth check
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
  if (!profile || !["admin", "manager"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();

  // Get search query param
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  // Build query
  let query = admin
    .from("email_tags")
    .select("*")
    .order("subscriber_count", { ascending: false });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: tags, error } = await query;

  if (error) {
    console.error("Failed to fetch tags:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }

  return NextResponse.json({ tags });
}

export async function POST(request: NextRequest) {
  // Auth check
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
  if (!profile || !["admin", "manager"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();

  // Parse body
  const body = await request.json();
  const { name, color, description } = body;

  // Validate
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Tag name is required" },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();

  // Insert tag
  const { data: tag, error: insertError } = await admin
    .from("email_tags")
    .insert({
      name: trimmedName,
      color: color || null,
      description: description || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to create tag:", insertError.message);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }

  // Count active subscribers who have this tag
  const { count, error: countError } = await admin
    .from("subscribers")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .contains("tags", [trimmedName]);

  if (!countError && count !== null) {
    // Update subscriber_count
    await admin
      .from("email_tags")
      .update({ subscriber_count: count })
      .eq("id", tag.id);

    tag.subscriber_count = count;
  }

  return NextResponse.json({ tag }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  // Auth check
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
  if (!profile || !["admin", "manager"].includes(profile.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = await createAdminClient();

  // Get tag id from query params
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Tag id is required" },
      { status: 400 }
    );
  }

  // Get the tag name before deleting (needed to remove from subscribers)
  const { data: tag, error: fetchError } = await admin
    .from("email_tags")
    .select("name")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Failed to fetch tag:", fetchError.message);
    return NextResponse.json(
      { error: "Failed to fetch tag" },
      { status: 500 }
    );
  }

  // Delete the tag
  const { error: deleteError } = await admin
    .from("email_tags")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Failed to delete tag:", deleteError.message);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }

  // Remove the tag from all subscribers' tags arrays
  if (tag?.name) {
    // Fetch subscribers that have this tag (safe parameterized query)
    const { data: subscribers } = await admin
      .from("subscribers")
      .select("id, tags")
      .contains("tags", [tag.name]);

    if (subscribers && subscribers.length > 0) {
      // Update each subscriber's tags array with the tag filtered out
      const updates = subscribers.map((subscriber) =>
        admin
          .from("subscribers")
          .update({
            tags: (subscriber.tags as string[]).filter(
              (t: string) => t !== tag.name
            ),
          })
          .eq("id", subscriber.id)
      );
      await Promise.all(updates);
    }
  }

  return NextResponse.json({ success: true });
}
