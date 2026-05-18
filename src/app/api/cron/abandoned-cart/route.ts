import { NextRequest, NextResponse } from "next/server";
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
  if (
    req.headers.get("authorization") !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
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

    // ── Process each abandoned order ──────────────────────────
    let emailed = 0;

    for (const order of abandonedOrders) {
      try {
        // Get user email from auth.users
        const {
          data: { user },
          error: userError,
        } = await admin.auth.admin.getUserById(order.user_id);

        if (userError || !user?.email) {
          console.warn(
            `[Abandoned Cart] Could not get email for user ${order.user_id}:`,
            userError?.message,
          );
          continue;
        }

        // Get product info
        const { data: product, error: productError } = await admin
          .from("products")
          .select("name, title, slug")
          .eq("id", order.product_id)
          .single();

        if (productError || !product) {
          console.warn(
            `[Abandoned Cart] Product not found for order ${order.id}:`,
            productError?.message,
          );
          continue;
        }

        // Get user profile name (fallback to email)
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name")
          .eq("id", order.user_id)
          .single();

        const userName =
          profile?.full_name ||
          user.user_metadata?.full_name ||
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
