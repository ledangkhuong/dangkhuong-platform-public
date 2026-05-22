import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/community/channels — return all channels ordered by sort_order
export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_channels")
    .select("id, name, description, icon, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("GET /api/community/channels error:", error.message);
    return NextResponse.json(
      { error: "Không thể tải danh sách khu vực." },
      { status: 500 }
    );
  }

  return NextResponse.json({ channels: data });
}
