import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone } = await req.json();

  // Validate Vietnamese phone
  const cleaned = phone?.replace(/\s+/g, "");
  if (!cleaned || !/^(0|\+84)[0-9]{9}$/.test(cleaned)) {
    return NextResponse.json(
      { error: "Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 số (VD: 0912345678)" },
      { status: 400 }
    );
  }

  // Update profile with phone
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: cleaned,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
