/**
 * Server-side Cloudflare Turnstile token verification.
 *
 * Usage in API routes:
 *   const ok = await verifyTurnstile(token);
 *   if (!ok) return NextResponse.json({ error: "CAPTCHA failed" }, { status: 400 });
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // If Turnstile is not configured, skip verification (dev mode)
  if (!secret) {
    console.warn("[Turnstile] TURNSTILE_SECRET_KEY not set — skipping verification");
    return true;
  }

  if (!token) return false;

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("[Turnstile] Verification error:", err);
    return false;
  }
}
