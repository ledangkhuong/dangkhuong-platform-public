/**
 * Rate limiter with optional Upstash Redis backend for distributed limiting.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars are set,
 * uses @upstash/ratelimit with Redis for distributed rate limiting that persists
 * across cold starts and is shared across all serverless instances.
 *
 * When Upstash is not configured, falls back to an in-memory implementation.
 * In-memory rate limiting still provides meaningful protection:
 * - It limits abuse within a single warm instance
 * - Most traffic hits a small pool of warm instances
 * - It's zero-dependency and zero-latency
 *
 * NOTE: The in-memory fallback resets on every cold start in serverless
 * environments (e.g. Vercel). Each serverless instance maintains its own
 * independent store, so rate limits are not shared across instances.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Upstash Redis configuration ────────────────────────────────────────────

const useUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

/** Shared Redis instance for login rate limiting (lazy-initialised). */
const redis = useUpstash ? Redis.fromEnv() : null;

const upstashLimiters: Record<string, Ratelimit> = {};

function getUpstashLimiter(
  prefix: string,
  maxRequests: number,
  windowSeconds: number
): Ratelimit {
  const key = `${prefix}:${maxRequests}:${windowSeconds}`;
  if (!upstashLimiters[key]) {
    upstashLimiters[key] = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      prefix: `rl:${prefix}`,
    });
  }
  return upstashLimiters[key];
}

// ─── Login-specific rate limiting ────────────────────────────────────────────

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number; // timestamp ms
  blockedUntil: number; // timestamp ms, 0 = not blocked
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const WINDOW_SEC = 10 * 60; // 10 minutes in seconds
const BLOCK_MS = 10 * 60 * 1000; // 10 minutes block
const BLOCK_DURATION_SEC = 10 * 60; // 10 minutes in seconds

// ─── In-memory fallback functions ───────────────────────────────────────────

function checkRateLimitMemory(ip: string): {
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

function recordFailedAttemptMemory(ip: string): void {
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

function resetRateLimitMemory(ip: string): void {
  store.delete(ip);
}

// ─── Redis-backed login rate limiting (with in-memory fallback) ─────────────

export async function checkRateLimit(key: string): Promise<{
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSec: number;
}> {
  if (!redis) return checkRateLimitMemory(key);

  const redisKey = `login-attempts:${key}`;
  const data = (await redis.get(redisKey)) as {
    attempts: number;
    blockedUntil?: number;
  } | null;

  if (data?.blockedUntil && Date.now() < data.blockedUntil) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSec: Math.ceil((data.blockedUntil - Date.now()) / 1000),
    };
  }

  const attempts = data?.attempts || 0;
  if (attempts >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSec: BLOCK_DURATION_SEC,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - attempts,
    retryAfterSec: 0,
  };
}

export async function recordFailedAttempt(key: string): Promise<void> {
  if (!redis) {
    recordFailedAttemptMemory(key);
    return;
  }

  const redisKey = `login-attempts:${key}`;
  const data = (await redis.get(redisKey)) as {
    attempts: number;
    blockedUntil?: number;
  } | null;
  const attempts = (data?.attempts || 0) + 1;

  if (attempts >= MAX_ATTEMPTS) {
    await redis.set(
      redisKey,
      { attempts, blockedUntil: Date.now() + BLOCK_DURATION_SEC * 1000 },
      { ex: BLOCK_DURATION_SEC }
    );
  } else {
    await redis.set(redisKey, { attempts }, { ex: WINDOW_SEC });
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  if (!redis) {
    resetRateLimitMemory(key);
    return;
  }
  await redis.del(`login-attempts:${key}`);
}

// ─── Generic sliding-window rate limiter ─────────────────────────────────────

interface SlidingWindowEntry {
  timestamps: number[]; // request timestamps within the window
}

const genericStore = new Map<string, SlidingWindowEntry>();

/**
 * Generic rate limiter for any endpoint.
 *
 * When Upstash is configured (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN),
 * uses distributed Redis-based sliding window. Otherwise falls back to an
 * in-memory sliding window algorithm.
 *
 * Returns { allowed: boolean, retryAfterSec: number }
 *
 * @example
 * ```ts
 * const { allowed, retryAfterSec } = await rateLimit(`api:${ip}`, 100, 60);
 * if (!allowed) {
 *   return Response.json(
 *     { error: "Too many requests", retryAfterSec },
 *     { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
 *   );
 * }
 * ```
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  // ── Upstash Redis path ──────────────────────────────────────────────────
  if (useUpstash) {
    const limiter = getUpstashLimiter("api", maxRequests, windowSeconds);
    const result = await limiter.limit(key);
    return {
      allowed: result.success,
      retryAfterSec: result.success
        ? 0
        : Math.ceil((result.reset - Date.now()) / 1000),
    };
  }

  // ── In-memory fallback ──────────────────────────────────────────────────
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
