/**
 * Server-side query helpers cho Vietnam address master data (Week 4 — Checkout).
 *
 * Phục vụ bước "Địa chỉ" của checkout flow: cascading select Tỉnh → Phường/Xã,
 * cùng các helper để hiển thị tên đầy đủ ("Phường X, Tỉnh Y") khi review đơn,
 * gửi email, in hoá đơn, v.v.
 *
 * Quy tắc chung:
 * - Dùng `createClient()` (anon, RLS public read đã setup ở Week 1).
 * - Bọc mỗi hàm bằng `cache()` từ "react" để dedupe trong cùng một request.
 *   Hai server components cùng gọi `getProvinces()` chỉ hit DB một lần.
 * - Throw `Error` khi DB lỗi; caller tự bọc try/catch nếu cần fallback.
 * - Chỉ select các cột thực sự cần (tránh kéo `name_en`, `code_name`,
 *   `division_type`, `phone_code` nếu không dùng).
 */

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { VnProvince, VnWard } from "@/types/ecommerce";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toError(scope: string, error: unknown): Error {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new Error(`[ecommerce/address-queries:${scope}] ${msg}`);
}

// ---------------------------------------------------------------------------
// 1) getProvinces — toàn bộ tỉnh/thành, sort theo name
// ---------------------------------------------------------------------------

/**
 * Trả về toàn bộ tỉnh/thành phố của Việt Nam, đã sort theo `name` (ASC).
 *
 * Dùng cho dropdown chọn tỉnh trong form địa chỉ. Dữ liệu master tĩnh nên
 * dedupe bằng `cache()` là đủ — không cần tag/revalidate tay.
 */
export const getProvinces = cache(async (): Promise<VnProvince[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vn_provinces")
    .select("code, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("[ecommerce/address-queries] getProvinces", error);
    throw toError("getProvinces", error);
  }

  return (data ?? []) as VnProvince[];
});

// ---------------------------------------------------------------------------
// 2) getWardsByProvince — phường/xã thuộc một tỉnh
// ---------------------------------------------------------------------------

/**
 * Trả về danh sách phường/xã của một tỉnh, sort theo `name` (ASC).
 *
 * Nếu `provinceCode` rỗng (user chưa chọn tỉnh) → trả về mảng rỗng
 * mà không hit DB, giúp form ban đầu render mượt.
 */
export const getWardsByProvince = cache(
  async (provinceCode: string): Promise<VnWard[]> => {
    if (!provinceCode) return [];

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vn_wards")
      .select("code, name, province_code")
      .eq("province_code", provinceCode)
      .order("name", { ascending: true });

    if (error) {
      console.error(
        "[ecommerce/address-queries] getWardsByProvince",
        provinceCode,
        error,
      );
      throw toError("getWardsByProvince", error);
    }

    return (data ?? []) as VnWard[];
  },
);

// ---------------------------------------------------------------------------
// 3) getWardByCode — lookup 1 phường/xã theo code
// ---------------------------------------------------------------------------

/**
 * Lookup chính xác một phường/xã theo `code`.
 *
 * Trả về `null` nếu không tìm thấy (không throw) — phù hợp với
 * trường hợp `shipping_ward_code` cũ bị xoá khỏi master data.
 */
export const getWardByCode = cache(
  async (wardCode: string): Promise<VnWard | null> => {
    if (!wardCode) return null;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vn_wards")
      .select("code, name, province_code")
      .eq("code", wardCode)
      .maybeSingle();

    if (error) {
      console.error(
        "[ecommerce/address-queries] getWardByCode",
        wardCode,
        error,
      );
      throw toError("getWardByCode", error);
    }

    return (data as VnWard | null) ?? null;
  },
);

// ---------------------------------------------------------------------------
// 4) getProvinceByCode — lookup 1 tỉnh theo code
// ---------------------------------------------------------------------------

/**
 * Lookup chính xác một tỉnh/thành theo `code`.
 *
 * Trả về `null` nếu không tìm thấy.
 */
export const getProvinceByCode = cache(
  async (provinceCode: string): Promise<VnProvince | null> => {
    if (!provinceCode) return null;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vn_provinces")
      .select("code, name")
      .eq("code", provinceCode)
      .maybeSingle();

    if (error) {
      console.error(
        "[ecommerce/address-queries] getProvinceByCode",
        provinceCode,
        error,
      );
      throw toError("getProvinceByCode", error);
    }

    return (data as VnProvince | null) ?? null;
  },
);

// ---------------------------------------------------------------------------
// 5) getAddressDisplay — hiển thị "Phường X, Tỉnh Y"
// ---------------------------------------------------------------------------

/**
 * Tiện ích cho UI: từ `wardCode` lấy ra tên phường + tên tỉnh tương ứng
 * trong một round-trip duy nhất (JOIN qua Supabase embed).
 *
 * Dùng khi render lại địa chỉ giao hàng trên trang Review, email xác nhận,
 * trang chi tiết đơn của admin, v.v.
 *
 * Trả về `null` nếu `wardCode` rỗng hoặc không tồn tại trong master data.
 */
export const getAddressDisplay = cache(
  async (
    wardCode: string,
  ): Promise<{ ward: string; province: string } | null> => {
    if (!wardCode) return null;

    const supabase = await createClient();

    // Embed province qua FK vn_wards.province_code → vn_provinces.code.
    // PostgREST trả về `province` là object (vì FK to-one), không phải array.
    const { data, error } = await supabase
      .from("vn_wards")
      .select("name, province:vn_provinces!province_code(name)")
      .eq("code", wardCode)
      .maybeSingle<{
        name: string;
        province: { name: string } | null;
      }>();

    if (error) {
      console.error(
        "[ecommerce/address-queries] getAddressDisplay",
        wardCode,
        error,
      );
      throw toError("getAddressDisplay", error);
    }

    if (!data || !data.province) return null;

    return {
      ward: data.name,
      province: data.province.name,
    };
  },
);
