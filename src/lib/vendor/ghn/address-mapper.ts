import "server-only";

/**
 * GHN Address Mapper — Week 5 Shipping.
 *
 * Lý do tồn tại
 * -------------
 * Schema nội bộ (Week 1) chỉ có 2 cấp địa chỉ: vn_provinces + vn_wards
 * (theo cải cách hành chính VN 2025 — bỏ cấp huyện/quận).
 *
 * GHN API HIỆN VẪN dùng model 3 cấp truyền thống:
 *   province_id (int) → district_id (int) → ward_code (string)
 *
 * → Mỗi request tính phí / tạo đơn GHN đều phải biết
 *   (to_district_id, to_ward_code), tức là phải "dịch" ward nội bộ
 *   sang cặp GHN trên.
 *
 * Module này lo phần dịch đó:
 *   1) Load province + ward nội bộ từ DB.
 *   2) Gọi GHN master-data API để tìm province → district → ward khớp tên.
 *   3) Cache kết quả vào table `ghn_address_cache` để các request sau
 *      khỏi gọi GHN nữa (tránh rate limit + giảm latency từ ~600ms về ~5ms).
 *   4) In-memory Map làm fallback nếu table cache chưa migrate / lỗi DB.
 *
 * Tham khảo migration: supabase/migrations/20260606_ghn_address_cache.sql
 *
 * ENV vars dùng:
 *   - GHN_TOKEN
 *   - GHN_BASE_URL        (default: prod gateway)
 *   - (KHÔNG dùng GHN_SHOP_ID cho master-data, GHN không bắt buộc)
 *
 * Quy tắc nội bộ:
 *   - Server-only (import "server-only" ở top).
 *   - Timeout 10s, retry 1 lần với exponential backoff.
 *   - Error handling: GHN code !== 200 → throw GhnApiError.
 *   - Không log token; chỉ log code + message + endpoint.
 */

import { cache } from "react";

import {
  getProvinceByCode,
  getWardByCode,
} from "@/lib/ecommerce/address-queries";
import { createAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input của mapToGHNAddress — caller chỉ cần truyền 2 mã nội bộ. */
export interface MapToGHNAddressInput {
  /** vn_provinces.code (vd "01" = Hà Nội). */
  provinceCode: string;
  /** vn_wards.code (vd "00001"). */
  wardCode: string;
}

/** Output sau khi dịch xong sang model 3 cấp của GHN. */
export interface GHNAddressMapping {
  ghnProvinceId: number;
  ghnDistrictId: number;
  ghnWardCode: string;
  /** Tên do GHN trả về, dùng để debug fuzzy match. */
  ghnProvinceName?: string;
  ghnDistrictName?: string;
  ghnWardName?: string;
}

interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  NameExtension?: string[];
}

interface GhnDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  NameExtension?: string[];
}

interface GhnWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
  NameExtension?: string[];
}

interface GhnEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Custom error class — để caller phân biệt lỗi GHN với lỗi DB/network khác.
// ---------------------------------------------------------------------------

export class GhnApiError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly code: number,
    message: string,
  ) {
    super(`[GHN ${endpoint}] code=${code} ${message}`);
    this.name = "GhnApiError";
  }
}

// ---------------------------------------------------------------------------
// In-memory fallback cache.
// Key = `${provinceCode}:${wardCode}` → mapping.
// Sẽ bị reset mỗi lần serverless instance cold-start; chỉ là safety net khi
// table ghn_address_cache chưa migrate / DB down.
// ---------------------------------------------------------------------------

const memCache = new Map<string, GHNAddressMapping>();
const memKey = (p: string, w: string) => `${p}:${w}`;

// ---------------------------------------------------------------------------
// String normalization — fuzzy match tên tiếng Việt.
// ---------------------------------------------------------------------------

/**
 * Bỏ dấu tiếng Việt + lowercase + trim, để so sánh tên province/district/ward
 * giữa nguồn nội bộ và GHN (GHN có thể trả "TP. Hồ Chí Minh" vs nội bộ
 * "Thành phố Hồ Chí Minh" chẳng hạn).
 *
 * Dùng cho fuzzy match — không decode về dạng "url-safe slug" (giữ space).
 */
export function removeAccents(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    // Strip combining diacritical marks
    .replace(/[̀-ͯ]/g, "")
    // đ/Đ không thuộc combining marks, normalize tay
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim();
}

/**
 * Loại bỏ các prefix hành chính phổ biến để so tên ngắn gọn.
 * Ví dụ: "Tỉnh Bắc Ninh" → "bac ninh", "Thành phố Hà Nội" → "ha noi",
 * "Phường 1" giữ nguyên "phuong 1".
 */
function stripAdminPrefix(input: string): string {
  const noAccent = removeAccents(input);
  return noAccent
    .replace(
      /^(tinh|thanh pho|tp\.?|tp|quan|huyen|thi xa|xa|phuong|thi tran)\s+/i,
      "",
    )
    .trim();
}

/**
 * Cho 2 chuỗi tên → trả về true nếu chúng "khớp" theo heuristic:
 *   - normalize bỏ dấu
 *   - strip prefix hành chính
 *   - so sánh equality hoặc 1 chuỗi chứa chuỗi kia
 *
 * Đủ tốt cho 99% trường hợp. Edge case (vd. "Quận 1" vs "Phường 1") cần
 * admin tay sửa entry trong ghn_address_cache.
 */
function namesMatch(a: string, b: string): boolean {
  const x = stripAdminPrefix(a);
  const y = stripAdminPrefix(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.includes(y) || y.includes(x);
}

// ---------------------------------------------------------------------------
// Low-level GHN fetch with timeout + retry.
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://online-gateway.ghn.vn/shiip/public-api/v2";
const TIMEOUT_MS = 10_000;

interface GhnFetchOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

async function ghnFetch<T>(
  endpoint: string,
  options: GhnFetchOptions = {},
): Promise<T> {
  const baseUrl = process.env.GHN_BASE_URL ?? DEFAULT_BASE_URL;
  const token = process.env.GHN_TOKEN;
  if (!token) {
    throw new Error(
      "[ghn/address-mapper] Missing GHN_TOKEN env var — không thể gọi GHN API.",
    );
  }

  const url = `${baseUrl}${endpoint}`;
  const method = options.method ?? "GET";

  const doFetch = async (): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Token: token,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
        // Master-data hiếm khi đổi → cache 1h ở Next.js fetch layer.
        // Khi đổi version Next nhớ verify default vẫn là cache.
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        // GHN nhiều khi trả 200 với code lỗi trong body; còn 4xx/5xx là
        // network/gateway error.
        throw new GhnApiError(endpoint, res.status, res.statusText);
      }

      const json = (await res.json()) as GhnEnvelope<T>;
      if (json.code !== 200) {
        throw new GhnApiError(endpoint, json.code, json.message);
      }
      return json.data;
    } finally {
      clearTimeout(timer);
    }
  };

  // 1 retry với exponential backoff 500ms. Chỉ retry network/timeout, không
  // retry GhnApiError business (vd. token sai → retry vô nghĩa).
  try {
    return await doFetch();
  } catch (err) {
    if (err instanceof GhnApiError) throw err;
    await new Promise((r) => setTimeout(r, 500));
    return await doFetch();
  }
}

// ---------------------------------------------------------------------------
// GHN master-data fetchers, wrap bằng React cache() để dedupe trong cùng
// request. Master-data đổi rất chậm → cũng dùng Next fetch revalidate ở
// ghnFetch để dedupe cross-request.
// ---------------------------------------------------------------------------

const ghnGetProvinces = cache(async (): Promise<GhnProvince[]> => {
  return ghnFetch<GhnProvince[]>("/master-data/province");
});

const ghnGetDistricts = cache(
  async (provinceId: number): Promise<GhnDistrict[]> => {
    return ghnFetch<GhnDistrict[]>("/master-data/district", {
      method: "POST",
      body: { province_id: provinceId },
    });
  },
);

const ghnGetWards = cache(async (districtId: number): Promise<GhnWard[]> => {
  return ghnFetch<GhnWard[]>("/master-data/ward", {
    method: "POST",
    body: { district_id: districtId },
  });
});

// ---------------------------------------------------------------------------
// Cache layer (Supabase ghn_address_cache).
// ---------------------------------------------------------------------------

async function readCacheRow(
  wardCode: string,
): Promise<GHNAddressMapping | null> {
  // 1) Memory hit trước.
  for (const [key, val] of memCache.entries()) {
    if (key.endsWith(`:${wardCode}`)) return val;
  }

  // 2) Thử DB. Dùng admin client để bypass RLS — table này server-only.
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("ghn_address_cache")
      .select(
        "ghn_district_id, ghn_ward_code, ghn_province_name, ghn_district_name, ghn_ward_name, province_code",
      )
      .eq("ward_code", wardCode)
      .maybeSingle();

    if (error) {
      // Table chưa exist (chưa migrate) → fallback im lặng, dùng memory.
      console.warn(
        "[ghn/address-mapper] readCacheRow DB error, fallback memory:",
        error.message,
      );
      return null;
    }
    if (!data) return null;

    // GHN province ID không lưu trong cache (không cần cho tính phí/create
    // order — chỉ district + ward là đủ). Set 0 placeholder.
    return {
      ghnProvinceId: 0,
      ghnDistrictId: data.ghn_district_id,
      ghnWardCode: data.ghn_ward_code,
      ghnProvinceName: data.ghn_province_name ?? undefined,
      ghnDistrictName: data.ghn_district_name ?? undefined,
      ghnWardName: data.ghn_ward_name ?? undefined,
    };
  } catch (err) {
    console.warn(
      "[ghn/address-mapper] readCacheRow exception, fallback memory:",
      err,
    );
    return null;
  }
}

async function writeCacheRow(
  input: MapToGHNAddressInput,
  mapping: GHNAddressMapping,
): Promise<void> {
  // 1) Memory luôn ghi.
  memCache.set(memKey(input.provinceCode, input.wardCode), mapping);

  // 2) DB best-effort.
  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("ghn_address_cache").upsert(
      {
        ward_code: input.wardCode,
        province_code: input.provinceCode,
        ghn_district_id: mapping.ghnDistrictId,
        ghn_ward_code: mapping.ghnWardCode,
        ghn_province_name: mapping.ghnProvinceName ?? null,
        ghn_district_name: mapping.ghnDistrictName ?? null,
        ghn_ward_name: mapping.ghnWardName ?? null,
        // mapped_at dùng default now() — chỉ refresh khi insert, không update
        // (updated_at trigger sẽ tự lo cho UPDATE).
      },
      { onConflict: "ward_code" },
    );
    if (error) {
      console.warn(
        "[ghn/address-mapper] writeCacheRow DB error (non-fatal):",
        error.message,
      );
    }
  } catch (err) {
    console.warn(
      "[ghn/address-mapper] writeCacheRow exception (non-fatal):",
      err,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API: mapToGHNAddress
// ---------------------------------------------------------------------------

/**
 * Map wardCode + provinceCode nội bộ sang (district_id, ward_code) của GHN.
 *
 * Flow:
 *   1) Check cache (memory + DB). Cache hit → trả luôn.
 *   2) Load tên province + tên ward từ schema nội bộ.
 *   3) Gọi GHN getProvinces → match province theo tên (fuzzy bỏ dấu).
 *   4) Gọi GHN getDistricts(provinceId) → tìm district có ward khớp tên.
 *      - Vì schema mình không có district nên phải brute-force: thử từng
 *        district, gọi getWards, tìm ward có name khớp với wardName nội bộ.
 *      - Để tránh tốn API: dừng ngay khi tìm thấy match đầu tiên.
 *   5) Lưu cache + return.
 *
 * Trả về `null` nếu KHÔNG tìm được match (caller nên fallback flat-rate
 * shipping placeholder của Week 4, không crash checkout).
 *
 * @example
 *   const m = await mapToGHNAddress({
 *     provinceCode: "01",
 *     wardCode: "00001",
 *   });
 *   if (!m) throw new Error("Không hỗ trợ GHN cho địa chỉ này");
 *   const fee = await ghnCalcFee({
 *     to_district_id: m.ghnDistrictId,
 *     to_ward_code: m.ghnWardCode,
 *     ...
 *   });
 */
export async function mapToGHNAddress(
  input: MapToGHNAddressInput,
): Promise<GHNAddressMapping | null> {
  const { provinceCode, wardCode } = input;
  if (!provinceCode || !wardCode) return null;

  // 1) Cache check.
  const cached = await readCacheRow(wardCode);
  if (cached) return cached;

  // 2) Load nội bộ.
  const [province, ward] = await Promise.all([
    getProvinceByCode(provinceCode),
    getWardByCode(wardCode),
  ]);
  if (!province || !ward) {
    console.warn(
      "[ghn/address-mapper] internal address not found",
      provinceCode,
      wardCode,
    );
    return null;
  }

  // 3) Match GHN province.
  let ghnProvinces: GhnProvince[];
  try {
    ghnProvinces = await ghnGetProvinces();
  } catch (err) {
    console.error("[ghn/address-mapper] ghnGetProvinces failed", err);
    return null;
  }

  const ghnProvince = ghnProvinces.find((p) => {
    if (namesMatch(p.ProvinceName, province.name)) return true;
    return (p.NameExtension ?? []).some((ext) =>
      namesMatch(ext, province.name),
    );
  });
  if (!ghnProvince) {
    console.warn(
      "[ghn/address-mapper] no GHN province match for",
      province.name,
    );
    return null;
  }

  // 4) Find district + ward.
  let ghnDistricts: GhnDistrict[];
  try {
    ghnDistricts = await ghnGetDistricts(ghnProvince.ProvinceID);
  } catch (err) {
    console.error("[ghn/address-mapper] ghnGetDistricts failed", err);
    return null;
  }

  // Heuristic: thử match tên district với phần đầu của ward.name trước
  // (nhiều ward sau cải cách 2025 mang tên trùng/giống huyện cũ).
  // Sau đó mới brute-force qua tất cả districts.
  const wardNameNoAccent = stripAdminPrefix(ward.name);

  const orderedDistricts = [...ghnDistricts].sort((a, b) => {
    const aMatch = namesMatch(a.DistrictName, ward.name) ? 1 : 0;
    const bMatch = namesMatch(b.DistrictName, ward.name) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    // Tiếp theo: district có tên xuất hiện trong wardName được ưu tiên.
    const aIn = wardNameNoAccent.includes(stripAdminPrefix(a.DistrictName))
      ? 1
      : 0;
    const bIn = wardNameNoAccent.includes(stripAdminPrefix(b.DistrictName))
      ? 1
      : 0;
    return bIn - aIn;
  });

  for (const district of orderedDistricts) {
    let ghnWardsList: GhnWard[];
    try {
      ghnWardsList = await ghnGetWards(district.DistrictID);
    } catch (err) {
      // Một số district GHN trả lỗi vì chưa support → skip qua district kế.
      console.warn(
        "[ghn/address-mapper] ghnGetWards skip district",
        district.DistrictID,
        err,
      );
      continue;
    }

    const matchedWard = ghnWardsList.find((w) => {
      if (namesMatch(w.WardName, ward.name)) return true;
      return (w.NameExtension ?? []).some((ext) => namesMatch(ext, ward.name));
    });

    if (matchedWard) {
      const mapping: GHNAddressMapping = {
        ghnProvinceId: ghnProvince.ProvinceID,
        ghnDistrictId: district.DistrictID,
        ghnWardCode: matchedWard.WardCode,
        ghnProvinceName: ghnProvince.ProvinceName,
        ghnDistrictName: district.DistrictName,
        ghnWardName: matchedWard.WardName,
      };
      // 5) Persist cache (fire-and-forget OK nhưng await để đảm bảo
      // request kế tiếp trong cùng request lifecycle thấy cache).
      await writeCacheRow(input, mapping);
      return mapping;
    }
  }

  console.warn(
    "[ghn/address-mapper] no GHN ward match for",
    ward.name,
    "in province",
    province.name,
  );
  return null;
}

// ---------------------------------------------------------------------------
// Admin/debug helpers (không export trên public surface chính nhưng vẫn
// export để admin tools dùng).
// ---------------------------------------------------------------------------

/** Xoá entry cache cho 1 ward — dùng khi admin phát hiện map sai. */
export async function invalidateGHNAddressCache(
  wardCode: string,
): Promise<void> {
  // Memory: xoá mọi key kết thúc bằng :wardCode.
  for (const key of memCache.keys()) {
    if (key.endsWith(`:${wardCode}`)) memCache.delete(key);
  }
  try {
    const supabase = await createAdminClient();
    await supabase.from("ghn_address_cache").delete().eq("ward_code", wardCode);
  } catch (err) {
    console.warn(
      "[ghn/address-mapper] invalidateGHNAddressCache failed",
      wardCode,
      err,
    );
  }
}
