// Helper tra cứu vị trí địa lý từ địa chỉ IP (chỉ chạy phía server).
// Sử dụng dịch vụ miễn phí ipapi.co, có cache 24h trong bộ nhớ tiến trình.
// Không bao giờ throw — trả về tất cả null khi gặp lỗi để caller xử lý an toàn.

export interface GeoLocation {
  country: string | null; // "Vietnam"
  countryCode: string | null; // "VN"
  region: string | null; // "Hanoi"
  city: string | null; // "Hanoi"
}

interface IpapiResponse {
  ip?: string;
  city?: string;
  region?: string;
  region_code?: string;
  country_code?: string;
  country_name?: string;
  error?: boolean;
  reason?: string;
}

interface CacheEntry {
  value: GeoLocation;
  expires: number;
}

// Free tier: 1000 req/day, không cần API key.
// Nếu cần thêm quota hoặc SLA, nâng cấp tại https://ipapi.co/#pricing
// (hoặc đổi sang nhà cung cấp khác như ipinfo.io, ip-api.com).
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 giờ
const FETCH_TIMEOUT_MS = 3000;

const cache = new Map<string, CacheEntry>();

const EMPTY_GEO: GeoLocation = {
  country: null,
  countryCode: null,
  region: null,
  city: null,
};

function isPrivateOrLocalIp(ip: string): boolean {
  const trimmed = ip.trim();

  if (trimmed === "" || trimmed === "::1" || trimmed === "::") {
    return true;
  }

  // IPv4-mapped IPv6 prefix (e.g. ::ffff:127.0.0.1) — bóc lớp prefix rồi kiểm tra IPv4.
  const v4Mapped = trimmed.toLowerCase().startsWith("::ffff:")
    ? trimmed.slice(7)
    : trimmed;

  // IPv6 link-local / unique-local
  const lower = v4Mapped.toLowerCase();
  if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }

  const parts = v4Mapped.split(".");
  if (parts.length !== 4) {
    return false; // không phải IPv4 hợp lệ — để API xử lý
  }

  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = nums;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true; // link-local
  if (a === 0) return true;

  return false;
}

function getCached(ip: string): GeoLocation | null {
  const entry = cache.get(ip);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(ip);
    return null;
  }
  return entry.value;
}

function setCached(ip: string, value: GeoLocation): void {
  cache.set(ip, { value, expires: Date.now() + CACHE_TTL_MS });
}

export async function lookupGeoFromIp(
  ip: string | null | undefined,
): Promise<GeoLocation> {
  if (!ip) {
    return EMPTY_GEO;
  }

  const normalized = ip.trim();
  if (normalized === "") {
    return EMPTY_GEO;
  }

  if (isPrivateOrLocalIp(normalized)) {
    return EMPTY_GEO;
  }

  const cached = getCached(normalized);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `https://ipapi.co/${encodeURIComponent(normalized)}/json/`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn("[geo]", "ipapi non-2xx response", {
        ip: normalized,
        status: res.status,
      });
      return EMPTY_GEO;
    }

    const data = (await res.json()) as IpapiResponse;

    if (data.error) {
      console.warn("[geo]", "ipapi returned error flag", {
        ip: normalized,
        reason: data.reason,
      });
      return EMPTY_GEO;
    }

    const geo: GeoLocation = {
      country: data.country_name ?? null,
      countryCode: data.country_code ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
    };

    setCached(normalized, geo);
    return geo;
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    console.warn("[geo]", isAbort ? "ipapi request timed out" : "ipapi request failed", {
      ip: normalized,
      error: err instanceof Error ? err.message : String(err),
    });
    return EMPTY_GEO;
  } finally {
    clearTimeout(timeoutId);
  }
}
