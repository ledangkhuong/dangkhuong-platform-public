/**
 * GET /api/vn-address/provinces
 *
 * Trả về toàn bộ tỉnh/thành Việt Nam (sort theo `name` ASC) phục vụ dropdown
 * "Tỉnh/Thành" trên form địa chỉ checkout (Week 4 — Step 1).
 *
 * - Dữ liệu master tĩnh → `Cache-Control: public, max-age=3600, s-maxage=3600,
 *   stale-while-revalidate=86400` để browser + CDN cache 1h, revalidate ngầm
 *   trong 1 ngày tiếp theo.
 * - Dedupe trong cùng một request bằng `cache()` ở `address-queries.ts`.
 * - Không yêu cầu auth: bảng `vn_provinces` có RLS public read.
 *
 * Trả về shape: `{ data: VnProvince[] }` để dễ mở rộng (thêm meta) sau này
 * mà không phải đổi contract phía client.
 */

import { NextResponse } from "next/server";

import { getProvinces } from "@/lib/ecommerce/address-queries";

// Vietnam address master data hầu như không thay đổi → cache aggressive.
// Nếu cần force refresh, deploy lại hoặc đổi version path là đủ.
const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

export async function GET() {
  try {
    const provinces = await getProvinces();

    return NextResponse.json(
      { data: provinces },
      {
        status: 200,
        headers: {
          "Cache-Control": CACHE_CONTROL,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    console.error("[api/vn-address/provinces] GET failed", error);
    return NextResponse.json(
      { error: "Không tải được danh sách tỉnh/thành" },
      { status: 500 },
    );
  }
}
