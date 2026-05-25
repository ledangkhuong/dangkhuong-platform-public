/**
 * Helper quản lý cookie `dk_vid` — định danh khách truy cập ẩn danh dài hạn.
 *
 * Cookie này tồn tại 2 năm, được dùng ở cả client (document.cookie) lẫn server
 * (Route Handler qua `NextRequest`, Server Component qua `next/headers`).
 * Giá trị là UUID v4 sinh bằng `crypto.randomUUID()` (Node 19+ và mọi trình
 * duyệt hiện đại đều hỗ trợ).
 *
 * Quy ước cookie:
 *   - Name:     dk_vid
 *   - Max-Age:  63072000 (2 năm)
 *   - Path:     /
 *   - SameSite: Lax
 *   - Secure:   luôn bật (project chạy HTTPS ở mọi môi trường)
 *   - HttpOnly: false  — client cần đọc được để gắn vào request/analytics
 *
 * Không có dependency bên ngoài.
 */

import type { NextRequest } from "next/server";

/**
 * Cookie name dùng ở mọi nơi. Long-lived (2 năm), SameSite=Lax, Secure trong prod.
 */
export const VISITOR_COOKIE = "dk_vid";

/** Hai năm tính bằng giây — dùng cho Max-Age. */
const TWO_YEARS_SECONDS = 60 * 60 * 24 * 365 * 2; // 63_072_000

/** Regex UUID v4 (loose) — chấp nhận chữ hoa hoặc chữ thường. */
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validate that a string is a UUID v4 (loose check). */
export function isValidVisitorId(id: string | undefined | null): id is string {
  return typeof id === "string" && UUID_V4_RE.test(id);
}

/** Generate a fresh UUID v4 visitor id (browser crypto or node crypto). */
export function generateVisitorId(): string {
  // `crypto.randomUUID()` có sẵn trên browser hiện đại và Node >= 19.
  // `globalThis.crypto` đảm bảo lấy đúng instance ở cả hai môi trường.
  return globalThis.crypto.randomUUID();
}

/**
 * Đọc giá trị cookie `dk_vid` từ chuỗi `document.cookie`.
 * Trả về `null` nếu không tìm thấy hoặc trống.
 */
function parseCookieFromDocument(cookieString: string): string | null {
  if (!cookieString) return null;
  const parts = cookieString.split(";");
  const prefix = `${VISITOR_COOKIE}=`;
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const raw = trimmed.slice(prefix.length);
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw || null;
      }
    }
  }
  return null;
}

/**
 * Ghi cookie `dk_vid` vào `document.cookie` (client-side).
 */
function writeVisitorIdToDocument(id: string): void {
  // `Secure` luôn bật. `HttpOnly` không tồn tại từ document.cookie.
  document.cookie =
    `${VISITOR_COOKIE}=${encodeURIComponent(id)}` +
    `; Max-Age=${TWO_YEARS_SECONDS}` +
    `; Path=/` +
    `; SameSite=Lax` +
    `; Secure`;
}

/**
 * Client-side: read cookie; if missing or invalid, generate + write back.
 * Returns the visitor id (never null).
 * Safe to call from "use client" components — uses document.cookie.
 */
export function getOrCreateVisitorIdClient(): string {
  // SSR fallback: không có `document` thì chỉ sinh id, không cố ghi cookie.
  if (typeof document === "undefined") {
    return generateVisitorId();
  }

  const existing = parseCookieFromDocument(document.cookie);
  if (isValidVisitorId(existing)) {
    return existing;
  }

  const fresh = generateVisitorId();
  writeVisitorIdToDocument(fresh);
  return fresh;
}

/**
 * Server-side helper for Next.js Route Handlers.
 * Read `dk_vid` from the request cookies. Returns id or null (does NOT generate).
 * Caller decides whether to generate + Set-Cookie on response.
 */
export function readVisitorIdFromRequest(req: NextRequest): string | null {
  const value = req.cookies.get(VISITOR_COOKIE)?.value;
  return isValidVisitorId(value) ? value : null;
}

/**
 * Server-side helper for Server Components — read from `next/headers`.
 * Returns id or null.
 */
export async function readVisitorIdFromCookies(): Promise<string | null> {
  // Next.js 15+: `cookies()` là async, phải await trước khi gọi `.get`.
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const value = store.get(VISITOR_COOKIE)?.value;
  return isValidVisitorId(value) ? value : null;
}

/**
 * Build a Set-Cookie header string for a fresh visitor id.
 * Use in Route Handlers when generating a new id.
 */
export function buildVisitorIdSetCookie(id: string): string {
  return (
    `${VISITOR_COOKIE}=${encodeURIComponent(id)}` +
    `; Max-Age=${TWO_YEARS_SECONDS}` +
    `; Path=/` +
    `; SameSite=Lax` +
    `; Secure`
  );
}
