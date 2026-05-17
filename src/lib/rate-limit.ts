/**
 * In-memory rate limiter for login attempts and generic endpoints.
 *
 * SERVERLESS LIMITATION: This rate limiter uses an in-memory Map, which means
 * it resets on every cold start in serverless environments (e.g. Vercel).
 * Each serverless instance maintains its own independent store, so rate limits
 * are not shared across instances.
 *
 * For production at scale, consider using @upstash/ratelimit with Redis, which
 * provides distributed rate limiting that persists across cold starts and is
 * shared across all serverless instances.
 *
 * That said, in-memory rate limiting still provides meaningful protection:
 * - It limits abuse within a single warm instance
 * - Most traffic hits a small pool of warm instances
 * - It's zero-dependency and zero-latency
 */

// ─── Login-specific rate limiting ────────────────────────────────────────────

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number; // timestamp ms
  blockedUntil: number; // timestamp ms, 0 = not blocked
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const BLOCK_MS = 10 * 60 * 1000; // 10 minutes block

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSec: number;
} {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSec: 0 };
  }

  // Currently blocked?
  if (entry.blockedUntil > now) {
    const retryAfterSec = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSec };
  }

  // Window expired? Reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    store.delete(ip);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, retryAfterSec: 0 };
  }

  // Within window, check attempts
  if (entry.attempts >= MAX_ATTEMPTS) {
    // Should have been blocked already, but just in case
    entry.blockedUntil = now + BLOCK_MS;
    const retryAfterSec = Math.ceil(BLOCK_MS / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSec };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.attempts,
    retryAfterSec: 0,
  };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    store.set(ip, { attempts: 1, firstAttempt: now, blockedUntil: 0 });
    return;
  }

  entry.attempts++;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
  }
}

export function resetRateLimit(ip: string): void {
  store.delete(ip);
}

// ─── Generic sliding-window rate limiter ─────────────────────────────────────

interface SlidingWindowEntry {
  timestamps: number[]; // request timestamps within the window
}

const genericStore = new Map<string, SlidingWindowEntry>();

/**
 * Generic rate limiter for any endpoint.
 * Uses a sliding window algorithm: tracks individual request timestamps
 * and counts how many fall within the most recent `windowSeconds`.
 *
 * Returns { allowed: boolean, retryAfterSec: number }
 *
 * NOTE: This is in-memory and resets on cold start. For production
 * at scale, consider using @upstash/ratelimit with Redis.
 * However, this still provides protection within a single instance
 * and is much better than no rate limiting.
 *
 * @example
 * ```ts
 * const { allowed, retryAfterSec } = rateLimit(`api:${ip}`, 100, 60);
 * if (!allowed) {
 *   return Response.json(
 *     { error: "Too many requests", retryAfterSec },
 *     { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
 *   );
 * }
 * ```
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  let entry = genericStore.get(key);

  if (!entry) {
    // First request for this key — allow and record
    genericStore.set(key, { timestamps: [now] });
    return { allowed: true, retryAfterSec: 0 };
  }

  // Prune timestamps that have fallen outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    // Rate limit exceeded — calculate when the oldest relevant request
    // will fall outside the window, allowing a new request
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    const retryAfterSec = Math.ceil(Math.max(retryAfterMs, 0) / 1000);
    return { allowed: false, retryAfterSec };
  }

  // Under limit — record this request and allow
  entry.timestamps.push(now);
  return { allowed: true, retryAfterSec: 0 };
}

// ─── Periodic cleanup of expired entries ─────────────────────────────────────

// Clean up expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Clean login rate limit store
  for (const [key, entry] of store) {
    if (now - entry.firstAttempt > WINDOW_MS && entry.blockedUntil < now) {
      store.delete(key);
    }
  }

  // Clean generic rate limit store
  // We can't know each key's window size, so we remove entries where
  // the most recent timestamp is older than 1 hour (conservative bound)
  const STALE_THRESHOLD = 60 * 60 * 1000; // 1 hour
  for (const [key, entry] of genericStore) {
    if (entry.timestamps.length === 0) {
      genericStore.delete(key);
      continue;
    }
    const mostRecent = entry.timestamps[entry.timestamps.length - 1];
    if (now - mostRecent > STALE_THRESHOLD) {
      genericStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL);
