import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let phone;
  try {
    ({ phone } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

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
    console.error("[CompleteProfile] Error:", error);
    return NextResponse.json({ error: "Có lỗi xảy ra khi cập nhật hồ sơ. Vui lòng thử lại." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
