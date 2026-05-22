import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/ses";
import { generateAbandonedCartEmail } from "@/lib/email/templates/abandoned-cart";

/**
 * Abandoned Cart Recovery Cron
 *
 * Finds pending orders created 1-24 hours ago that haven't received
 * a recovery email yet, then sends a reminder email to each user.
 *
 * Schedule: every 6 hours via Vercel Cron (see vercel.json)
 * Auth: Bearer token via CRON_SECRET env var
 */
export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
  const expected = Buffer.from(expectedAuth, "utf-8");
  const received = Buffer.from(authHeader, "utf-8");
  const isAuthorized =
    expected.length === received.length &&
    timingSafeEqual(expected, received);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = await createAdminClient();

    // ── Find abandoned orders ─────────────────────────────────
    // Orders with status='pending', created between 1 and 24 hours ago,
    // and not yet sent a recovery email.
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: abandonedOrders, error: queryError } = await admin
      .from("orders")
      .select("id, user_id, product_id, amount, order_code")
      .eq("status", "pending")
      .eq("recovery_email_sent", false)
      .gte("created_at", twentyFourHoursAgo)
      .lte("created_at", oneHourAgo)
      .limit(100);

    if (queryError) {
      console.error("[Abandoned Cart] Query error:", queryError.message);
      return NextResponse.json(
        { error: "Failed to query abandoned orders" },
        { status: 500 },
      );
    }

    if (!abandonedOrders || abandonedOrders.length === 0) {
      return NextResponse.json({ processed: 0, emailed: 0 });
    }

    // ── Batch-fetch all related data upfront ─────────────────
    const uniqueUserIds = [...new Set(abandonedOrders.map((o) => o.user_id))];
    const uniqueProductIds = [
      ...new Set(abandonedOrders.map((o) => o.product_id)),
    ];

    // Fetch all auth users in parallel (no batch API for auth.admin)
    const userResults = await Promise.allSettled(
      uniqueUserIds.map((uid) => admin.auth.admin.getUserById(uid)),
    );
    const usersById = new Map<
      string,
      { email: string; user_metadata?: Record<string, unknown> }
    >();
    for (let i = 0; i < uniqueUserIds.length; i++) {
      const result = userResults[i];
      if (result.status === "fulfilled") {
        const { data, error } = result.value;
        if (!error && data?.user?.email) {
          usersById.set(uniqueUserIds[i], {
            email: data.user.email,
            user_metadata: data.user.user_metadata as
              | Record<string, unknown>
              | undefined,
          });
        } else {
          console.warn(
            `[Abandoned Cart] Could not get email for user ${uniqueUserIds[i]}:`,
            error?.message,
          );
        }
      } else {
        console.warn(
          `[Abandoned Cart] Failed to fetch user ${uniqueUserIds[i]}:`,
          result.reason,
        );
      }
    }

    // Batch-fetch all products in a single query
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("id, name, title, slug")
      .in("id", uniqueProductIds);

    if (productsError) {
      console.error(
        "[Abandoned Cart] Batch products query error:",
        productsError.message,
      );
    }
    const productsById = new Map(
      (products ?? []).map((p) => [p.id, p]),
    );

    // Batch-fetch all profiles in a single query
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", uniqueUserIds);

    if (profilesError) {
      console.error(
        "[Abandoned Cart] Batch profiles query error:",
        profilesError.message,
      );
    }
    const profilesById = new Map(
      (profiles ?? []).map((p) => [p.id, p]),
    );

    // ── Send recovery emails individually ────────────────────
    let emailed = 0;

    for (const order of abandonedOrders) {
      try {
        const user = usersById.get(order.user_id);
        if (!user) {
          continue;
        }

        const product = productsById.get(order.product_id);
        if (!product) {
          console.warn(
            `[Abandoned Cart] Product not found for order ${order.id}`,
          );
          continue;
        }

        const profile = profilesById.get(order.user_id);
        const userName =
          profile?.full_name ||
          (user.user_metadata?.full_name as string | undefined) ||
          user.email.split("@")[0];

        const productName = product.title || product.name;
        const productSlug = product.slug;

        // Generate and send recovery email
        const { subject, html } = generateAbandonedCartEmail(
          userName,
          productName,
          productSlug,
          order.amount,
        );

        const result = await sendEmail(user.email, subject, html);

        if (result.success) {
          // Mark order as recovery email sent
          await admin
            .from("orders")
            .update({
              recovery_email_sent: true,
              recovery_email_sent_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          emailed++;
          console.log(
            `[Abandoned Cart] Recovery email sent for order ${order.id} to ${user.email}`,
          );
        } else {
          console.error(
            `[Abandoned Cart] Failed to send email for order ${order.id}:`,
            result.error,
          );
        }
      } catch (err) {
        console.error(
          `[Abandoned Cart] Error processing order ${order.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return NextResponse.json({
      processed: abandonedOrders.length,
      emailed,
    });
  } catch (err) {
    console.error(
      "[Abandoned Cart] Unexpected error:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
