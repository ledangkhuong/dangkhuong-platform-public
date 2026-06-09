/**
 * /api/utm-links
 *   POST → save a new UTM link the current user just generated.
 *   GET  → list links; admin/manager see everyone's, anyone else sees own.
 *   DELETE ?id=... → delete a single link (own, or admin/manager).
 *
 * Backed by public.utm_links + RLS, so we can use the SSR client and the
 * policy enforces the per-role visibility rules without us re-checking
 * here. We do still confirm the requesting user has a staff role so an
 * end-customer can't enumerate the table.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STAFF_ROLES = new Set([
  "admin",
  "manager",
  "marketing",
  "sale",
  "editor",
  "instructor",
]);

async function getStaffUser(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      supabase,
      user: null,
      role: null,
    };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? null;
  if (!role || !STAFF_ROLES.has(role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      supabase,
      user,
      role,
    };
  }
  return { error: null, supabase, user, role };
}

export async function POST(req: NextRequest) {
  const { error, supabase, user } = await getStaffUser(req);
  if (error) return error;

  let body: {
    base_url?: string;
    url?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    label?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim();
  const baseUrl = body.base_url?.trim();
  const utmSource = body.utm_source?.trim();
  if (!url || !baseUrl || !utmSource) {
    return NextResponse.json(
      { error: "base_url, url, utm_source required" },
      { status: 400 }
    );
  }

  const cap = (v: string | undefined, max = 255) =>
    v?.trim().slice(0, max) || null;

  const { data, error: insErr } = await supabase
    .from("utm_links")
    .insert({
      base_url: baseUrl.slice(0, 500),
      url: url.slice(0, 1000),
      utm_source: utmSource.slice(0, 100),
      utm_medium: cap(body.utm_medium, 100),
      utm_campaign: cap(body.utm_campaign, 200),
      utm_term: cap(body.utm_term, 200),
      utm_content: cap(body.utm_content, 200),
      label: cap(body.label, 200),
      notes: cap(body.notes, 500),
      created_by: user!.id,
    })
    .select("id, created_at")
    .single();

  if (insErr) {
    console.error("[utm-links POST]", insErr.message);
    return NextResponse.json(
      { error: "Failed to save link" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, id: data.id, created_at: data.created_at });
}

export async function GET(req: NextRequest) {
  const { error, supabase } = await getStaffUser(req);
  if (error) return error;

  // RLS handles per-row visibility (own + admin/manager see all).
  //
  // Note: we don't use Supabase relational select syntax
  // (`creator:created_by(full_name)`) here because utm_links.created_by
  // FKs to auth.users(id), not public.profiles(id) — PostgREST can't
  // resolve the join automatically. We fetch profiles in a second batch
  // query and merge in code.
  const { data: links, error: queryErr } = await supabase
    .from("utm_links")
    .select(
      "id, base_url, url, utm_source, utm_medium, utm_campaign, utm_term, utm_content, label, notes, created_by, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (queryErr) {
    console.error("[utm-links GET]", queryErr.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // Resolve created_by → profile full_name in a single batch query
  const creatorIds = Array.from(
    new Set((links ?? []).map((l) => l.created_by).filter(Boolean) as string[])
  );
  const creatorMap = new Map<string, { full_name: string | null }>();
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", creatorIds);
    for (const p of profiles ?? []) {
      creatorMap.set(p.id, { full_name: p.full_name });
    }
  }

  const linksWithCreator = (links ?? []).map((l) => ({
    ...l,
    creator: l.created_by ? creatorMap.get(l.created_by) ?? null : null,
  }));

  return NextResponse.json({ links: linksWithCreator });
}

export async function DELETE(req: NextRequest) {
  const { error, supabase } = await getStaffUser(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const { error: delErr } = await supabase
    .from("utm_links")
    .delete()
    .eq("id", id);
  if (delErr) {
    console.error("[utm-links DELETE]", delErr.message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
