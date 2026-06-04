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

// ── PATCH: update ───────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireMarketingStaff();
  if (!auth.authorized) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  // Whitelist các field được phép update
  const allowed = [
    "name",
    "description",
    "pixel_id",
    "capi_access_token",
    "test_event_code",
    "is_active",
    "apply_to_all_pages",
    "custom_events",
    "notes",
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) patch[k] = body[k];
  }

  // Validate pixel_id nếu có
  if (typeof patch.pixel_id === "string" && !/^\d{6,20}$/.test(patch.pixel_id)) {
    return Response.json({ error: "Pixel ID không hợp lệ" }, { status: 400 });
  }

  // Normalise empty strings → null cho các field optional
  for (const k of ["description", "capi_access_token", "test_event_code", "notes"]) {
    if (patch[k] === "") patch[k] = null;
  }

  patch.updated_by = auth.userId;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("pixel_configs")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[admin pixel-configs PATCH]", error.message);
    return Response.json({ error: "Lỗi khi cập nhật" }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Không tìm thấy cấu hình" }, { status: 404 });
  }

  // Sync landing_page_pixels nếu client gửi landing_page_ids
  if (Array.isArray(body.landing_page_ids)) {
    const applyToAll = data.apply_to_all_pages === true;
    // Xoá bindings cũ
    await admin.from("landing_page_pixels").delete().eq("pixel_config_id", id);
    // Insert mới (chỉ khi không phải apply_to_all)
    if (!applyToAll) {
      const ids = (body.landing_page_ids as unknown[]).filter((x): x is string => typeof x === "string");
      if (ids.length > 0) {
        const rows = ids.map((lid, i) => ({
          landing_page_id: lid,
          pixel_config_id: id,
          position: i,
        }));
        const { error: bindErr } = await admin.from("landing_page_pixels").insert(rows);
        if (bindErr) {
          console.error("[admin pixel-configs PATCH bind]", bindErr.message);
        }
      }
    }
  } else if (typeof body.apply_to_all_pages === "boolean" && body.apply_to_all_pages === true) {
    // Switch sang "Toàn site" mà không gửi landing_page_ids → xoá hết bindings (tránh trùng tracking)
    await admin.from("landing_page_pixels").delete().eq("pixel_config_id", id);
  }

  return Response.json({ success: true, config: data });
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
  const { error } = await admin.from("pixel_configs").delete().eq("id", id);

  if (error) {
    console.error("[admin pixel-configs DELETE]", error.message);
    return Response.json({ error: "Lỗi khi xoá" }, { status: 500 });
  }
  return Response.json({ success: true });
}
