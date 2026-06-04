import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Check if the current user is admin or manager.
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

// ─── GET: List all plans (including inactive) ───────────────────────────────

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const admin = await createAdminClient();

    const { data: plans, error } = await admin
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[Admin Sub GET] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi tải danh sách gói đăng ký" },
        { status: 500 }
      );
    }

    // Get subscriber count per plan
    const plansWithCounts = await Promise.all(
      (plans ?? []).map(async (plan) => {
        const { count } = await admin
          .from("user_subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("plan_id", plan.id)
          .eq("status", "active");
        return { ...plan, active_subscribers: count ?? 0 };
      })
    );

    return Response.json({ plans: plansWithCounts });
  } catch (err) {
    console.error("[Admin Sub GET] Error:", err);
    return Response.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// ─── POST: Create a new plan ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    let body: {
      name?: string;
      slug?: string;
      description?: string;
      billing_period?: string;
      price?: number;
      original_price?: number | null;
      features?: string[];
      tier_granted?: string;
      sort_order?: number;
    };

    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      description,
      billing_period,
      price,
      original_price,
      features,
      tier_granted,
      sort_order,
    } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return Response.json(
        { error: "Tên gói phải có ít nhất 2 ký tự" },
        { status: 400 }
      );
    }

    if (!slug || typeof slug !== "string") {
      return Response.json(
        { error: "Slug không hợp lệ" },
        { status: 400 }
      );
    }

    const validPeriods = ["monthly", "3months", "6months", "yearly"];
    if (!billing_period || !validPeriods.includes(billing_period)) {
      return Response.json(
        { error: "Chu kỳ thanh toán không hợp lệ" },
        { status: 400 }
      );
    }

    if (!price || typeof price !== "number" || price <= 0) {
      return Response.json(
        { error: "Giá phải lớn hơn 0" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    const { data: plan, error } = await admin
      .from("subscription_plans")
      .insert({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description || null,
        billing_period,
        price,
        original_price: original_price ?? null,
        features: features ?? [],
        tier_granted: tier_granted || "member",
        is_active: true,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "Slug này đã tồn tại" },
          { status: 409 }
        );
      }
      console.error("[Admin Sub POST] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi tạo gói đăng ký" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, plan });
  } catch (err) {
    console.error("[Admin Sub POST] Error:", err);
    return Response.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// ─── PUT: Update a plan ─────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    let body: {
      id?: string;
      name?: string;
      slug?: string;
      description?: string;
      billing_period?: string;
      price?: number;
      original_price?: number | null;
      features?: string[];
      tier_granted?: string;
      is_active?: boolean;
      sort_order?: number;
    };

    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { id, ...updates } = body;

    if (!id) {
      return Response.json(
        { error: "Thiếu id gói đăng ký" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    const { data: plan, error } = await admin
      .from("subscription_plans")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "Slug này đã tồn tại" },
          { status: 409 }
        );
      }
      console.error("[Admin Sub PUT] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi cập nhật gói đăng ký" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, plan });
  } catch (err) {
    console.error("[Admin Sub PUT] Error:", err);
    return Response.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// ─── DELETE: Soft-delete a plan (set is_active = false) ─────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    let body: { plan_id?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }

    const { plan_id } = body;

    if (!plan_id) {
      return Response.json(
        { error: "Thiếu plan_id" },
        { status: 400 }
      );
    }

    const admin = await createAdminClient();

    const { error } = await admin
      .from("subscription_plans")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan_id);

    if (error) {
      console.error("[Admin Sub DELETE] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi vô hiệu hoá gói đăng ký" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[Admin Sub DELETE] Error:", err);
    return Response.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
