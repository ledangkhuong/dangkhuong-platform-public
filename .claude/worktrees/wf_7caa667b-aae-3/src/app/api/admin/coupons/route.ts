import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Check if the current user is admin or manager.
 * Returns the user object if authorized, or a Response if not.
 */
async function requireAdmin(): Promise<
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
      response: Response.json(
        { error: "Chưa đăng nhập" },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, userId: user.id };
}

// ─── GET: List all coupons ───────────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const admin = await createAdminClient();
    const { data: coupons, error } = await admin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Admin Coupons GET] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi tải danh sách mã giảm giá" },
        { status: 500 }
      );
    }

    return Response.json({ coupons: coupons ?? [] });
  } catch (err) {
    console.error("[Admin Coupons GET] Error:", err);
    return Response.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

// ─── POST: Create a coupon ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    let body: {
      code?: string;
      discount_type?: string;
      discount_value?: number;
      max_uses?: number | null;
      min_order_amount?: number;
      expires_at?: string | null;
    };

    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { code, discount_type, discount_value, max_uses, min_order_amount, expires_at } = body;

    // Validation
    if (!code || typeof code !== "string" || code.trim().length < 3) {
      return Response.json(
        { error: "Mã giảm giá phải có ít nhất 3 ký tự" },
        { status: 400 }
      );
    }

    if (!discount_type || !["percent", "fixed"].includes(discount_type)) {
      return Response.json(
        { error: "Loại giảm giá không hợp lệ (percent hoặc fixed)" },
        { status: 400 }
      );
    }

    if (!discount_value || typeof discount_value !== "number" || discount_value <= 0) {
      return Response.json(
        { error: "Giá trị giảm giá phải lớn hơn 0" },
        { status: 400 }
      );
    }

    if (discount_type === "percent" && discount_value > 100) {
      return Response.json(
        { error: "Giảm giá phần trăm không thể vượt quá 100%" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    const { data: coupon, error } = await admin
      .from("coupons")
      .insert({
        code: code.trim().toUpperCase(),
        discount_type,
        discount_value,
        max_uses: max_uses ?? null,
        min_order_amount: min_order_amount ?? 0,
        expires_at: expires_at ?? null,
        is_active: true,
        used_count: 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "Mã giảm giá này đã tồn tại" },
          { status: 409 }
        );
      }
      console.error("[Admin Coupons POST] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi tạo mã giảm giá" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, coupon });
  } catch (err) {
    console.error("[Admin Coupons POST] Error:", err);
    return Response.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Delete a coupon ─────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    let body: { coupon_id?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { coupon_id } = body;

    if (!coupon_id) {
      return Response.json(
        { error: "Thiếu coupon_id" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();
    const { error } = await admin
      .from("coupons")
      .delete()
      .eq("id", coupon_id);

    if (error) {
      console.error("[Admin Coupons DELETE] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi xoá mã giảm giá" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[Admin Coupons DELETE] Error:", err);
    return Response.json(
      { error: "Lỗi hệ thống" },
      { status: 500 }
    );
  }
}
