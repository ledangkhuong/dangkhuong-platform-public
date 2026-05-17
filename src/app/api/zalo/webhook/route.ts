import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

/**
 * ZALO OA WEBHOOK
 *
 * Zalo OA goi endpoint nay khi co su kien (follow, unfollow, tin nhan, ...)
 * Docs: https://developers.zalo.me/docs/official-account/webhook
 *
 * Cau hinh tai Zalo OA Dashboard:
 *   Webhook URL: https://dangkhuong.com/api/zalo/webhook
 *   Secret Key: ZALO_OA_SECRET_KEY
 *
 * SQL migration (run once):
 *   ALTER TABLE profiles ADD COLUMN zalo_user_id TEXT DEFAULT NULL;
 *   CREATE INDEX idx_profiles_zalo ON profiles(zalo_user_id) WHERE zalo_user_id IS NOT NULL;
 */

// GET: Zalo verification (echo back challenge)
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (!challenge) {
    return NextResponse.json({ error: "Missing challenge" }, { status: 400 });
  }
  // Zalo sends a GET request with ?challenge=xxx, we echo it back to verify
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// POST: Handle events from Zalo OA
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 100 requests per 60 seconds per IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterSec } = await rateLimit(`zalo-webhook:${ip}`, 100, 60);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfterSec },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const rawBody = await req.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Verify webhook signature if secret key is configured
    const secretKey = process.env.ZALO_OA_SECRET_KEY;
    if (secretKey) {
      const timestamp = body.timestamp as string | undefined;
      const signature = req.headers.get("X-ZEvent-Signature") || "";
      if (timestamp && signature) {
        const mac = crypto
          .createHmac("sha256", secretKey)
          .update(rawBody)
          .digest("hex");
        if (signature !== `mac=${mac}`) {
          console.warn("[Zalo Webhook] Invalid signature");
          return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }
      }
    }

    const eventName = body.event_name as string | undefined;
    console.log("[Zalo Webhook] Received event:", eventName);

    const supabase = await createAdminClient();

    switch (eventName) {
      case "follow": {
        // User follows OA -> link zalo_user_id to profile
        const follower = body.follower as { id: string } | undefined;
        const info = body.info as { name?: string; phone?: string } | undefined;
        if (!follower?.id) break;

        const zaloUserId = follower.id;
        console.log("[Zalo Webhook] User followed OA:", zaloUserId, info?.name);

        // Try to match by phone number if available
        if (info?.phone) {
          const normalizedPhone = info.phone.replace(/\D/g, "");
          const { data: matchedProfile } = await supabase
            .from("profiles")
            .select("id, zalo_user_id")
            .or(`phone.eq.${info.phone},phone.eq.${normalizedPhone},phone.eq.+84${normalizedPhone.slice(-9)}`)
            .is("zalo_user_id", null)
            .limit(1)
            .single();

          if (matchedProfile) {
            await supabase
              .from("profiles")
              .update({ zalo_user_id: zaloUserId })
              .eq("id", matchedProfile.id);
            console.log("[Zalo Webhook] Linked Zalo user to profile:", matchedProfile.id);
          }
        }

        // Log the follow event (table may not exist yet - non-critical)
        try {
          await supabase.from("zalo_webhook_events").insert({
            event_name: "follow",
            zalo_user_id: zaloUserId,
            payload: body,
          });
        } catch { /* ignore */ }

        break;
      }

      case "unfollow": {
        // User unfollows OA -> remove zalo_user_id from profile
        const unfollower = body.follower as { id: string } | undefined;
        if (!unfollower?.id) break;

        const zaloUserId = unfollower.id;
        console.log("[Zalo Webhook] User unfollowed OA:", zaloUserId);

        await supabase
          .from("profiles")
          .update({ zalo_user_id: null })
          .eq("zalo_user_id", zaloUserId);

        // Log the unfollow event
        try {
          await supabase.from("zalo_webhook_events").insert({
            event_name: "unfollow",
            zalo_user_id: zaloUserId,
            payload: body,
          });
        } catch { /* ignore */ }

        break;
      }

      case "user_send_text": {
        // User sends text message to OA -> log for future chatbot
        const sender = body.sender as { id: string } | undefined;
        const message = body.message as { text?: string } | undefined;
        if (!sender?.id) break;

        console.log("[Zalo Webhook] Message from:", sender.id, ":", message?.text?.substring(0, 50));

        // Log the message event
        try {
          await supabase.from("zalo_webhook_events").insert({
            event_name: "user_send_text",
            zalo_user_id: sender.id,
            payload: body,
          });
        } catch { /* ignore */ }

        break;
      }

      default:
        console.log("[Zalo Webhook] Unhandled event:", eventName);
        // Log unknown events too
        try {
          await supabase.from("zalo_webhook_events").insert({
            event_name: eventName || "unknown",
            zalo_user_id: (body.sender as { id?: string })?.id || (body.follower as { id?: string })?.id || "unknown",
            payload: body,
          });
        } catch { /* ignore */ }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Zalo Webhook Error]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
