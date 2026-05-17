import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/affiliate/click
 * Public endpoint — không cần auth (visitor chưa đăng nhập cũng track được)
 * Ghi nhận click từ AffiliateTracker component
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = await rateLimit(`affiliate-click:${ip}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json();
    const { ref_code, page_url, referrer } = body;

    if (!ref_code || typeof ref_code !== "string" || ref_code.length < 4) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const code = ref_code.toUpperCase();
    const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? "";

    const supabase = await createAdminClient();

    // Verify affiliate exists and is active
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id, status, total_clicks")
      .eq("ref_code", code)
      .single();

    if (!affiliate || affiliate.status !== "active") {
      return NextResponse.json({ ok: false });
    }

    // Simple rate limit: skip duplicate clicks from same IP within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("affiliate_clicks")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_id", affiliate.id)
      .eq("ip", ip)
      .gte("created_at", oneHourAgo);

    if (count && count > 0) {
      // Vẫn set cookie nhưng không tính click trùng
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    // Insert click
    await supabase.from("affiliate_clicks").insert({
      affiliate_id: affiliate.id,
      ref_code: code,
      ip,
      user_agent: userAgent,
      page_url: page_url?.slice(0, 500) || null,
      referrer: referrer?.slice(0, 500) || null,
    });

    // Increment click counter
    await supabase
      .from("affiliates")
      .update({ total_clicks: (affiliate.total_clicks || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", affiliate.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Affiliate Click]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
