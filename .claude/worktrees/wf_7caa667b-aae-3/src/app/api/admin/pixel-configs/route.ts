import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Yêu cầu admin/manager/marketing role. */
async function requireMarketingStaff(): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; response: Response }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: Response.json({ error: "Chưa đăng nhập" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager", "marketing"].includes(profile.role)) {
    return {
      authorized: false,
      response: Response.json({ error: "Không có quyền truy cập" }, { status: 403 }),
    };
  }

  return { authorized: true, userId: user.id };
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ── GET: list ───────────────────────────────────────────────────────────────
export async function GET() {
  const auth = await requireMarketingStaff();
  if (!auth.authorized) return auth.response;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("pixel_configs")
    .select(`*, landing_page_pixels (landing_page_id)`)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Lỗi tải danh sách" }, { status: 500 });
  }

  return Response.json({ configs: data ?? [] });
}

// ── POST: create ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireMarketingStaff();
  if (!auth.authorized) return auth.response;

  let body: {
    slug?: string;
    name?: string;
    description?: string | null;
    pixel_id?: string;
    capi_access_token?: string | null;
    test_event_code?: string | null;
    is_active?: boolean;
    apply_to_all_pages?: boolean;
    custom_events?: Record<string, unknown>;
    notes?: string | null;
    /** Nếu có + apply_to_all_pages=false → bind pixel vào các landing này luôn. */
    landing_page_ids?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  // Validate
  const slug = (body.slug || "").trim().toLowerCase();
  if (!slug || !SLUG_RE.test(slug)) {
    return Response.json(
      { error: "Slug không hợp lệ (chỉ chữ thường, số, gạch ngang)" },
      { status: 400 },
    );
  }
  if (!body.name || body.name.trim().length < 2) {
    return Response.json({ error: "Tên cấu hình quá ngắn" }, { status: 400 });
  }
  if (!body.pixel_id || !/^\d{6,20}$/.test(body.pixel_id.trim())) {
    return Response.json(
      { error: "Pixel ID phải là số (6-20 ký tự)" },
      { status: 400 },
    );
  }

  const admin = await createAdminClient();
  const applyToAll = body.apply_to_all_pages === true;
  const { data, error } = await admin
    .from("pixel_configs")
    .insert({
      slug,
      name: body.name.trim(),
      description: body.description ?? null,
      pixel_id: body.pixel_id.trim(),
      capi_access_token: body.capi_access_token?.trim() || null,
      test_event_code: body.test_event_code?.trim() || null,
      is_active: body.is_active ?? true,
      apply_to_all_pages: applyToAll,
      custom_events: body.custom_events ?? {},
      notes: body.notes ?? null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Slug đã tồn tại" }, { status: 409 });
    }
    console.error("[admin pixel-configs POST]", error.message);
    return Response.json({ error: "Lỗi khi tạo cấu hình" }, { status: 500 });
  }

  // Bind vào landing pages nếu không phải apply_to_all (và có chọn landing)
  if (!applyToAll && Array.isArray(body.landing_page_ids) && body.landing_page_ids.length > 0) {
    const rows = body.landing_page_ids
      .filter((x) => typeof x === "string")
      .map((lid, i) => ({
        landing_page_id: lid,
        pixel_config_id: data.id,
        position: i,
      }));
    if (rows.length > 0) {
      const { error: bindErr } = await admin.from("landing_page_pixels").insert(rows);
      if (bindErr) {
        console.error("[admin pixel-configs POST bind]", bindErr.message);
        // Không revert pixel config — chỉ warn
      }
    }
  }

  return Response.json({ success: true, config: data });
}
