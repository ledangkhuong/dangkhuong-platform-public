import "server-only";

import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export const CART_COOKIE_NAME = "dk_cart_id";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Read the cart token (UUID) from the request cookie jar.
 * Returns null when no cookie is set yet (e.g. first-time visitor).
 */
export async function getCartTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CART_COOKIE_NAME)?.value;
  return value && value.length > 0 ? value : null;
}

/**
 * Persist the cart token cookie. Must be called from a Server Action
 * or Route Handler — Next.js disallows cookie writes from RSC render.
 */
export async function setCartTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: CART_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

/**
 * Remove the cart token cookie (e.g. after checkout completes or
 * after merging a guest cart into a user cart on login).
 */
export async function clearCartTokenCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: CART_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Get the existing cart token or mint a new UUID and persist it.
 * Use this from Server Actions before inserting into `carts` so the
 * resulting row's `cart_token` matches the cookie on the client.
 */
export async function ensureCartToken(): Promise<string> {
  const existing = await getCartTokenFromCookie();
  if (existing) return existing;

  const token = randomUUID();
  await setCartTokenCookie(token);
  return token;
}
