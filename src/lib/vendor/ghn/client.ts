import "server-only";

/**
 * GHN (Giao Hang Nhanh) API v2 raw HTTP client.
 *
 * Docs: https://api.ghn.vn/home/docs/detail
 *
 * Server-only. Do NOT import in client components.
 *
 * Auth via headers:
 *  - Token: <GHN_TOKEN>
 *  - ShopId: <GHN_SHOP_ID>
 *
 * GHN response envelope: { code: number, message: string, data: T }
 * - code === 200 → success, return `data`
 * - code !== 200 → throw GHNError(message, code)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://online-gateway.ghn.vn/shiip/public-api/v2";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 300;

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class GHNError extends Error {
  public readonly code: number;
  public readonly path?: string;

  constructor(message: string, code: number, path?: string) {
    super(message);
    this.name = "GHNError";
    this.code = code;
    this.path = path;
  }
}

// ---------------------------------------------------------------------------
// Types — master data
// ---------------------------------------------------------------------------

export interface GHNProvince {
  ProvinceID: number;
  ProvinceName: string;
  CountryID: number;
  Code?: string;
  NameExtension?: string[];
}

export interface GHNDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  Code?: string;
  Type?: number;
  SupportType?: number;
  NameExtension?: string[];
}

export interface GHNWard {
  WardCode: string;
  DistrictID: number;
  WardName: string;
  NameExtension?: string[];
  SupportType?: number;
}

// ---------------------------------------------------------------------------
// Types — fee calculation
// ---------------------------------------------------------------------------

export interface FeeInputItem {
  name: string;
  quantity: number;
  height?: number;
  weight: number;
  length?: number;
  width?: number;
}

export interface FeeInput {
  /** Sender district. If not provided, GHN uses shop's default. */
  from_district_id?: number;
  from_ward_code?: string;
  /** Recipient. */
  to_district_id: number;
  to_ward_code: string;
  /** Service id from getServices — preferred. */
  service_id?: number;
  /** 2 = express, 5 = standard. */
  service_type_id?: number;
  /** Package dimensions in cm, weight in grams. */
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  /** Cash on delivery amount (VND). */
  insurance_value?: number;
  cod_value?: number;
  coupon?: string | null;
  items?: FeeInputItem[];
}

export interface FeeResult {
  total: number;
  service_fee: number;
  insurance_fee: number;
  pick_station_fee?: number;
  coupon_value?: number;
  r2s_fee?: number;
  return_again?: number;
  document_return?: number;
  double_check?: number;
  cod_fee?: number;
  pick_remote_areas_fee?: number;
  deliver_remote_areas_fee?: number;
  cod_failed_fee?: number;
}

// ---------------------------------------------------------------------------
// Types — service
// ---------------------------------------------------------------------------

export interface GHNService {
  service_id: number;
  short_name: string;
  service_type_id: number;
}

// ---------------------------------------------------------------------------
// Types — order
// ---------------------------------------------------------------------------

export interface OrderInputItem {
  name: string;
  code?: string;
  quantity: number;
  price?: number;
  length?: number;
  width?: number;
  height?: number;
  weight: number;
  category?: { level1?: string; level2?: string; level3?: string };
}

export interface OrderInput {
  payment_type_id: 1 | 2; // 1 = shop pays, 2 = buyer pays
  note?: string;
  required_note: "CHOTHUHANG" | "CHOXEMHANGKHONGTHU" | "KHONGCHOXEMHANG";
  return_phone?: string;
  return_address?: string;
  return_district_id?: number | null;
  return_ward_code?: string;
  client_order_code?: string;

  // From (sender) — optional; defaults to shop config in GHN.
  from_name?: string;
  from_phone?: string;
  from_address?: string;
  from_ward_name?: string;
  from_district_name?: string;
  from_province_name?: string;

  // To (recipient)
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_name?: string;
  to_ward_code: string;
  to_district_name?: string;
  to_district_id: number;
  to_province_name?: string;

  // Package
  cod_amount?: number;
  content?: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  cod_failed_amount?: number;
  pick_station_id?: number;
  deliver_station_id?: number | null;
  insurance_value?: number;
  service_id?: number;
  service_type_id?: number;
  coupon?: string | null;
  pickup_time?: number; // unix seconds
  pick_shift?: number[];
  items: OrderInputItem[];
}

export interface OrderResult {
  order_code: string;
  sort_code?: string;
  trans_type?: string;
  ward_encode?: string;
  district_encode?: string;
  fee?: {
    main_service?: number;
    insurance?: number;
    station_do?: number;
    station_pu?: number;
    return?: number;
    r2s?: number;
    coupon?: number;
  };
  total_fee?: number;
  expected_delivery_time?: string;
}

export interface OrderDetailLog {
  status: string;
  payment_type_id?: number;
  trip_code?: string;
  updated_date: string;
}

export interface OrderDetail {
  order_code: string;
  status: string;
  payment_type_id?: number;
  required_note?: string;
  from_name?: string;
  from_phone?: string;
  from_address?: string;
  from_ward_code?: string;
  from_district_id?: number;
  to_name?: string;
  to_phone?: string;
  to_address?: string;
  to_ward_code?: string;
  to_district_id?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  cod_amount?: number;
  insurance_value?: number;
  service_id?: number;
  service_type_id?: number;
  total_fee?: number;
  expected_delivery_time?: string;
  log?: OrderDetailLog[];
  pickup_time?: string;
  finish_date?: string | null;
  leadtime?: string;
}

export interface CancelResultItem {
  order_code: string;
  result: boolean;
  message?: string;
}

export type CancelResult = CancelResultItem[];

// ---------------------------------------------------------------------------
// Internal envelope type
// ---------------------------------------------------------------------------

interface GHNEnvelope<T> {
  code: number;
  message: string;
  data: T;
  code_message_value?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface GHNClientOptions {
  token: string;
  shopId: string | number;
  baseUrl?: string;
  /** Override request timeout (ms). Default 10_000. */
  timeoutMs?: number;
}

export class GHNClient {
  private readonly token: string;
  private readonly shopId: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: GHNClientOptions) {
    if (!opts.token) throw new Error("GHNClient: token is required");
    if (opts.shopId === undefined || opts.shopId === null || opts.shopId === "") {
      throw new Error("GHNClient: shopId is required");
    }
    this.token = opts.token;
    this.shopId = String(opts.shopId);
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // -------------------------------------------------------------------------
  // Core request
  // -------------------------------------------------------------------------

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: object,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const normalisedPath = path.startsWith("/") ? path : `/${path}`;
    let url = `${this.baseUrl}${normalisedPath}`;

    if (query && Object.keys(query).length > 0) {
      const usp = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) usp.append(k, String(v));
      }
      const qs = usp.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Token: this.token,
      ShopId: this.shopId,
    };

    let lastNetworkError: unknown = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(url, {
          method,
          headers,
          body: method === "POST" && body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timer);

        // Try to parse JSON regardless of status — GHN returns JSON envelope
        // even for many error cases.
        let parsed: GHNEnvelope<T> | null = null;
        const text = await res.text();
        if (text) {
          try {
            parsed = JSON.parse(text) as GHNEnvelope<T>;
          } catch {
            parsed = null;
          }
        }

        if (!parsed) {
          // Non-JSON response. If HTTP failed, throw with status; otherwise
          // surface a generic error.
          throw new GHNError(
            `GHN non-JSON response (HTTP ${res.status})`,
            res.status || 0,
            normalisedPath,
          );
        }

        if (parsed.code !== 200) {
          throw new GHNError(
            parsed.message || `GHN error code ${parsed.code}`,
            parsed.code,
            normalisedPath,
          );
        }

        return parsed.data;
      } catch (err) {
        clearTimeout(timer);

        // GHNError = API-level error, do NOT retry. Propagate immediately.
        if (err instanceof GHNError) {
          throw err;
        }

        // Network / abort / fetch failure → retry once with exponential backoff.
        lastNetworkError = err;
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        const reason =
          err instanceof Error
            ? err.name === "AbortError"
              ? `GHN request timed out after ${this.timeoutMs}ms`
              : err.message
            : "Unknown network error";
        throw new GHNError(reason, 0, normalisedPath);
      }
    }

    // Should be unreachable.
    throw new GHNError(
      lastNetworkError instanceof Error ? lastNetworkError.message : "GHN request failed",
      0,
      normalisedPath,
    );
  }

  // -------------------------------------------------------------------------
  // Master data
  // -------------------------------------------------------------------------

  /** GET /master-data/province */
  async getProvinces(): Promise<GHNProvince[]> {
    return this.request<GHNProvince[]>("/master-data/province", "GET");
  }

  /** GET /master-data/district?province_id=... */
  async getDistricts(provinceId: number): Promise<GHNDistrict[]> {
    return this.request<GHNDistrict[]>("/master-data/district", "GET", undefined, {
      province_id: provinceId,
    });
  }

  /** GET /master-data/ward?district_id=... */
  async getWards(districtId: number): Promise<GHNWard[]> {
    return this.request<GHNWard[]>("/master-data/ward", "GET", undefined, {
      district_id: districtId,
    });
  }

  // -------------------------------------------------------------------------
  // Services
  // -------------------------------------------------------------------------

  /**
   * POST /shipping-order/available-services
   * Returns the service options available between two districts.
   */
  async getServices(input: {
    from_district: number;
    to_district: number;
    shop_id?: number;
  }): Promise<GHNService[]> {
    const body = {
      shop_id: input.shop_id ?? Number(this.shopId),
      from_district: input.from_district,
      to_district: input.to_district,
    };
    return this.request<GHNService[]>("/shipping-order/available-services", "POST", body);
  }

  // -------------------------------------------------------------------------
  // Fee
  // -------------------------------------------------------------------------

  /** POST /shipping-order/fee */
  async calculateFee(input: FeeInput): Promise<FeeResult> {
    return this.request<FeeResult>("/shipping-order/fee", "POST", input);
  }

  // -------------------------------------------------------------------------
  // Order
  // -------------------------------------------------------------------------

  /** POST /shipping-order/create */
  async createOrder(input: OrderInput): Promise<OrderResult> {
    return this.request<OrderResult>("/shipping-order/create", "POST", input);
  }

  /** POST /shipping-order/detail */
  async getOrderDetail(orderCode: string): Promise<OrderDetail> {
    return this.request<OrderDetail>("/shipping-order/detail", "POST", {
      order_code: orderCode,
    });
  }

  /** POST /shipping-order/cancel */
  async cancelOrder(orderCodes: string[]): Promise<CancelResult> {
    return this.request<CancelResult>("/shipping-order/cancel", "POST", {
      order_codes: orderCodes,
    });
  }
}

// ---------------------------------------------------------------------------
// Convenience factory — reads env vars.
// ---------------------------------------------------------------------------

/**
 * Build a GHNClient from process.env. Throws if required vars are missing.
 *
 * Env vars:
 *  - GHN_TOKEN (required)
 *  - GHN_SHOP_ID (required)
 *  - GHN_BASE_URL (optional, defaults to production)
 */
export function ghnClientFromEnv(): GHNClient {
  const token = process.env.GHN_TOKEN;
  const shopId = process.env.GHN_SHOP_ID;
  if (!token) throw new Error("GHN_TOKEN env var is not set");
  if (!shopId) throw new Error("GHN_SHOP_ID env var is not set");
  return new GHNClient({
    token,
    shopId,
    baseUrl: process.env.GHN_BASE_URL,
  });
}
