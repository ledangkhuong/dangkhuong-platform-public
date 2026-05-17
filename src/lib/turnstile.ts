/**
 * Server-side Cloudflare Turnstile token verification.
 *
 * Usage in API routes:
 *   const ok = await verifyTurnstile(token);
 *   if (!ok) return NextResponse.json({ error: "CAPTCHA failed" }, { status: 400 });
 */

export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // In development without key configured, allow through
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Turnstile] SECRET_KEY not configured in production!");
      return false;
    }
    return true;
  }

  // Token must be a real token, not empty or bypass strings
  if (!token || token === "__turnstile_timeout__" || token === "__turnstile_error__") {
    console.warn("[Turnstile] Invalid or missing token");
    return false;
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("[Turnstile] Verification network error:", err);
    return false; // Don't allow on error
  }
}
