/**
 * In-memory rate limiter for login attempts.
 * Tracks failed attempts per IP. Resets on successful login.
 *
 * Limits: 5 failed attempts per IP within 10 minutes → block for 10 minutes.
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number; // timestamp ms
  blockedUntil: number; // timestamp ms, 0 = not blocked
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const BLOCK_MS = 10 * 60 * 1000; // 10 minutes block

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.firstAttempt > WINDOW_MS && entry.blockedUntil < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

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
