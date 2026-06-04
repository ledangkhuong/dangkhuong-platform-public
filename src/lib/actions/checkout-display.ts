"use server";

/**
 * Server Action wrapper cho address display lookup từ Client Component.
 *
 * `getAddressDisplay()` ở `@/lib/ecommerce/address-queries` là server-only
 * helper (dùng `react/cache`). Client Component không thể gọi trực tiếp,
 * nên ta wrap lại thành Server Action trả về shape `{ ok, ward, province }`.
 *
 * Dùng cho ReviewStep: hiển thị "Phường X, Tỉnh Y" thay vì ward_code thô.
 */

import { getAddressDisplay as getAddressDisplayQuery } from "@/lib/ecommerce/address-queries";

export interface AddressDisplayResult {
  ok: boolean;
  ward: string | null;
  province: string | null;
}

export async function getAddressDisplay(
  wardCode: string,
): Promise<AddressDisplayResult> {
  try {
    const code = (wardCode ?? "").trim();
    if (!code) {
      return { ok: false, ward: null, province: null };
    }
    const result = await getAddressDisplayQuery(code);
    if (!result) {
      return { ok: false, ward: null, province: null };
    }
    return { ok: true, ward: result.ward, province: result.province };
  } catch (err) {
    console.error("[checkout-display] getAddressDisplay failed", err);
    return { ok: false, ward: null, province: null };
  }
}
