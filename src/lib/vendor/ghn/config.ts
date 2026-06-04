import "server-only";

/**
 * GHN (Giao Hàng Nhanh) configuration + singleton client factory.
 *
 * Loads credentials from env vars. Throws on missing critical values
 * (GHN_TOKEN, GHN_SHOP_ID) so misconfiguration fails loudly at startup.
 *
 * Service type IDs:
 *   - 2 = express
 *   - 5 = standard (default)
 */

export interface GHNConfig {
  /** GHN API token (from shop's GHN dashboard). */
  token: string;
  /** Numeric ShopId registered with GHN. */
  shopId: number;
  /** API base URL — production by default, can override for sandbox. */
  baseUrl: string;
  /** Warehouse district_id (GHN's province → district → ward 3-tier model). */
  fromDistrictId: number;
  /** Warehouse ward_code (GHN string code). */
  fromWardCode: string;
  /** Default service_type_id used for fee/order requests when caller omits one. */
  defaultServiceTypeId: number;
}

const DEFAULT_BASE_URL =
  "https://online-gateway.ghn.vn/shiip/public-api/v2";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `[GHN] Missing required environment variable: ${name}. ` +
        `Set it in .env.local before using the GHN client.`,
    );
  }
  return value;
}

function parseIntEnv(name: string, fallback?: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(
      `[GHN] Missing required numeric environment variable: ${name}.`,
    );
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `[GHN] Environment variable ${name} must be an integer (got "${raw}").`,
    );
  }
  return parsed;
}

let cachedConfig: GHNConfig | null = null;

/**
 * Load and validate GHN config from environment.
 * Memoized — subsequent calls return the same object.
 *
 * Throws if GHN_TOKEN or GHN_SHOP_ID are missing.
 * Warehouse origin (fromDistrictId / fromWardCode) is required only when
 * actually calling fee/create endpoints; we still validate here so the
 * error surfaces early during boot rather than at request time.
 */
export function getGHNConfig(): GHNConfig {
  if (cachedConfig) return cachedConfig;

  const token = requireEnv("GHN_TOKEN");
  const shopId = parseIntEnv("GHN_SHOP_ID");
  const baseUrl = (process.env.GHN_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
  const fromDistrictId = parseIntEnv("GHN_FROM_DISTRICT_ID");
  const fromWardCode = requireEnv("GHN_FROM_WARD_CODE");
  const defaultServiceTypeId = parseIntEnv("GHN_DEFAULT_SERVICE_TYPE_ID", 5);

  cachedConfig = {
    token,
    shopId,
    baseUrl,
    fromDistrictId,
    fromWardCode,
    defaultServiceTypeId,
  };
  return cachedConfig;
}

/**
 * Reset the memoized config. Only used by tests that want to swap env vars.
 * @internal
 */
export function __resetGHNConfigForTests(): void {
  cachedConfig = null;
  cachedClient = null;
}

// ─── Client singleton ────────────────────────────────────────────────────
//
// The actual GHNClient class lives in ./client.ts (Week 4 deliverable).
// We import it lazily so this config module stays usable on its own and
// so a missing client.ts doesn't break callers that only need config.

/**
 * Minimal shape the singleton factory needs. The real type comes from
 * ./client.ts once that file lands. Kept as a structural type here to
 * avoid a hard dependency cycle.
 */
export interface GHNClient {
  readonly config: GHNConfig;
}

let cachedClient: GHNClient | null = null;

/**
 * Return a process-wide GHNClient singleton, constructing it on first call.
 *
 * The client module is loaded via dynamic `require` so this file can be
 * imported (e.g. for type-checking config) before `./client.ts` exists.
 */
export function getGHNClient(): GHNClient {
  if (cachedClient) return cachedClient;

  const config = getGHNConfig();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("./client") as {
    GHNClient: new (config: GHNConfig) => GHNClient;
  };
  cachedClient = new mod.GHNClient(config);
  return cachedClient;
}
