import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireMarketingStaff(): Promise<
  | { authorized: true; userId: string; role: string }
  | { authorized: false; response: Response }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, response: Response.json({ error: "Chưa đăng nhập" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "marketing"].includes(profile.role)) {
    return { authorized: false, response: Response.json({ error: "Không có quyền" }, { status: 403 }) };
  }
  return { authorized: true, userId: user.id, role: profile.role };
}

const PATHNAME_RE = /^\/[a-zA-Z0-9/_\.\-]*$/;

// ── PATCH: update + attach/detach pixels ────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMarketingStaff();
  if (!auth.authorized) return auth.response;

  let body: {
    pathname?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
    notes?: string | null;
    /** Nếu có field này → replace toàn bộ danh sách pixel attach */
    pixel_config_ids?: string[];
    page_event?: string | null;
    form_submit_event?: string | null;
    event_value?: number | null;
    event_currency?: string | null;
    event_content_name?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const admin = await createAdminClient();

  // 1. Update các field thông tin
  const patch: Record<string, unknown> = { updated_by: auth.userId };
  if (body.pathname !== undefined) {
    let pn = body.pathname.trim();
    if (!pn.startsWith("/")) pn = "/" + pn;
    pn = pn.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
    if (!PATHNAME_RE.test(pn)) {
      return Response.json({ error: "Pathname không hợp lệ" }, { status: 400 });
    }
    patch.pathname = pn;
  }
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.notes !== undefined) patch.notes = body.notes?.trim() || null;

  // Event triggers — validate against Meta Standard Events whitelist
  const META_STANDARD_EVENTS = [
    "AddPaymentInfo", "AddToCart", "AddToWishlist", "CompleteRegistration",
    "Contact", "CustomizeProduct", "Donate", "FindLocation", "InitiateCheckout",
    "Lead", "Purchase", "Schedule", "Search", "StartTrial", "SubmitApplication",
    "Subscribe", "ViewContent",
  ];
  function validEvent(v: unknown): string | null {
    if (v === null || v === "" || v === undefined) return null;
    if (typeof v === "string" && META_STANDARD_EVENTS.includes(v)) return v;
    return null;
  }
  if ("page_event" in body) patch.page_event = validEvent(body.page_event);
  if ("form_submit_event" in body) patch.form_submit_event = validEvent(body.form_submit_event);
  if ("event_value" in body) {
    const v = body.event_value;
    patch.event_value = typeof v === "number" && v > 0 ? Math.floor(v) : null;
  }
  if ("event_currency" in body) {
    const c = (body.event_currency || "").toString().trim().toUpperCase();
    patch.event_currency = c.length === 3 ? c : "VND";
  }
  if ("event_content_name" in body) {
    patch.event_content_name = body.event_content_name?.toString().trim() || null;
  }

  if (Object.keys(patch).length > 1) {
    const { error } = await admin.from("landing_pages").update(patch).eq("id", id);
    if (error) {
      if (error.code === "23505") return Response.json({ error: "Pathname đã tồn tại" }, { status: 409 });
      console.error("[admin landing-pages PATCH]", error.message);
      return Response.json({ error: "Lỗi khi cập nhật" }, { status: 500 });
    }
  }

  // 2. Sync attached pixels (replace toàn bộ)
  if (Array.isArray(body.pixel_config_ids)) {
    const ids = Array.from(new Set(body.pixel_config_ids.filter((x) => typeof x === "string")));

    // Xoá cũ
    const { error: delErr } = await admin
      .from("landing_page_pixels").delete().eq("landing_page_id", id);
    if (delErr) {
      console.error("[admin landing-pages PATCH attach delete]", delErr.message);
      return Response.json({ error: "Lỗi khi cập nhật danh sách pixel" }, { status: 500 });
    }

    if (ids.length > 0) {
      const rows = ids.map((pid, i) => ({
        landing_page_id: id,
        pixel_config_id: pid,
        position: i,
      }));
      const { error: insErr } = await admin.from("landing_page_pixels").insert(rows);
      if (insErr) {
        console.error("[admin landing-pages PATCH attach insert]", insErr.message);
        return Response.json({ error: "Lỗi khi gắn pixel" }, { status: 500 });
      }
    }
  }

  // 3. Return updated landing kèm pixels
  const { data } = await admin
    .from("landing_pages")
    .select(`*, landing_page_pixels (pixel_config_id, position)`)
    .eq("id", id)
    .single();

  return Response.json({ success: true, landing: data });
}

// ── DELETE: chỉ admin/manager ───────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMarketingStaff();
  if (!auth.authorized) return auth.response;
  if (!["admin", "manager"].includes(auth.role)) {
    return Response.json({ error: "Chỉ admin/manager được xoá" }, { status: 403 });
  }

  const admin = await createAdminClient();
  const { error } = await admin.from("landing_pages").delete().eq("id", id);
  if (error) {
    console.error("[admin landing-pages DELETE]", error.message);
    return Response.json({ error: "Lỗi khi xoá" }, { status: 500 });
  }
  return Response.json({ success: true });
}
