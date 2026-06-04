import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendZaloMessage } from "@/lib/zalo-oa";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/zalo/test
 * Send a test Zalo message (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check: admin only
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 5 test messages per 60 seconds
    const { allowed, retryAfterSec } = await rateLimit(`zalo-test:${user.id}`, 5, 60);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: `Qua nhieu yeu cau. Vui long thu lai sau ${retryAfterSec}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { zaloUserId, message } = body;

    if (!zaloUserId || !message) {
      return NextResponse.json(
        { success: false, error: "Thieu zaloUserId hoac message" },
        { status: 400 }
      );
    }

    const result = await sendZaloMessage(zaloUserId, message);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Zalo Test]", err);
    return NextResponse.json(
      { success: false, error: "Loi he thong" },
      { status: 500 }
    );
  }
}
