import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function requireMarketingStaff(): Promise<
  | { authorized: true; userId: string; role: string }
  | { authorized: false; response: Response }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authorized: false, response: Response.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "marketing"].includes(profile.role)) {
    return { authorized: false, response: Response.json({ error: "Không có quyền" }, { status: 403 }) };
  }
  return { authorized: true, userId: user.id, role: profile.role };
}

const PATHNAME_RE = /^\/[a-zA-Z0-9/_\.\-]*$/;

// ── GET: list landing pages + pixel counts ──────────────────────────────────
export async function GET() {
  const auth = await requireMarketingStaff();
  if (!auth.authorized) return auth.response;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("landing_pages")
    .select(`*, landing_page_pixels (pixel_config_id)`)
    .order("pathname", { ascending: true });

  if (error) return Response.json({ error: "Lỗi tải danh sách" }, { status: 500 });

  const rows = (data ?? []).map((r: { landing_page_pixels?: unknown[]; [k: string]: unknown }) => {
    const { landing_page_pixels, ...rest } = r;
    return {
      ...rest,
      pixel_count: Array.isArray(landing_page_pixels) ? landing_page_pixels.length : 0,
    };
  });

  return Response.json({ landings: rows });
}

// ── POST: create landing ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireMarketingStaff();
  if (!auth.authorized) return auth.response;

  let body: {
    pathname?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  let pathname = (body.pathname || "").trim();
  if (!pathname.startsWith("/")) pathname = "/" + pathname;
  pathname = pathname.replace(/\/+/g, "/").replace(/\/$/, "") || "/";

  if (!PATHNAME_RE.test(pathname)) {
    return Response.json({ error: "Pathname không hợp lệ (chỉ chữ-số, /, -, _, .)" }, { status: 400 });
  }
  if (!body.name || body.name.trim().length < 2) {
    return Response.json({ error: "Tên landing quá ngắn" }, { status: 400 });
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("landing_pages")
    .insert({
      pathname,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      is_active: body.is_active ?? true,
      notes: body.notes?.trim() || null,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Pathname đã tồn tại" }, { status: 409 });
    }
    console.error("[admin landing-pages POST]", error.message);
    return Response.json({ error: "Lỗi khi tạo landing" }, { status: 500 });
  }

  return Response.json({ success: true, landing: data });
}
