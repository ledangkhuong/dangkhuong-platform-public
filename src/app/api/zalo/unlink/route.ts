import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * POST /api/zalo/unlink
 * Unlink Zalo account from user profile
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await createAdminClient();
    await admin
      .from("profiles")
      .update({ zalo_user_id: null })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Zalo Unlink]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
