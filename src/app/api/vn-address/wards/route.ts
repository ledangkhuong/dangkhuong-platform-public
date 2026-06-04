/**
 * GET /api/vn-address/wards?province=<code>
 *
 * Trả về danh sách phường/xã thuộc một tỉnh/thành, dùng cho dropdown thứ hai
 * của cascading select trong form địa chỉ (Week 4 — Step 1).
 *
 * Query params:
 * - `province` (bắt buộc, text): mã tỉnh/thành (FK `vn_provinces.code`).
 *   Thiếu hoặc rỗng → trả về 400 để client tự xử lý.
 *
 * - Cache: public, max-age=3600, stale-while-revalidate=86400 — giống endpoint
 *   provinces. Vì URL có query `?province=XX` nên CDN tự cache theo từng tỉnh.
 * - Không yêu cầu auth: bảng `vn_wards` có RLS public read.
 *
 * Trả về shape: `{ data: VnWard[] }`.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getWardsByProvince } from "@/lib/ecommerce/address-queries";

const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: NextRequest) {
  const provinceCode = request.nextUrl.searchParams.get("province")?.trim();

  if (!provinceCode) {
    return NextResponse.json(
      { error: "Thiếu tham số `province`" },
      { status: 400 },
    );
  }

  try {
    const wards = await getWardsByProvince(provinceCode);

    return NextResponse.json(
      { data: wards },
      {
        status: 200,
        headers: {
          "Cache-Control": CACHE_CONTROL,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (error) {
    console.error(
      "[api/vn-address/wards] GET failed",
      { provinceCode },
      error,
    );
    return NextResponse.json(
      { error: "Không tải được danh sách phường/xã" },
      { status: 500 },
    );
  }
}
