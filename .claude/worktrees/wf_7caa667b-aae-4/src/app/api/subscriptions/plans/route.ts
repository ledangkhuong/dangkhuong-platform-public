import { createAdminClient } from "@/lib/supabase/server";

// ─── GET: List all active subscription plans (public) ───────────────────────

export async function GET() {
  try {
    const supabase = await createAdminClient();

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[Plans GET] Error:", error.message);
      return Response.json(
        { error: "Lỗi khi tải danh sách gói đăng ký" },
        { status: 500 }
      );
    }

    return Response.json(
      { plans: plans ?? [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("[Plans GET] Error:", err);
    return Response.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
