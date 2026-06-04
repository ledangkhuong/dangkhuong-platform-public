/**
 * Subscription Utility Functions
 *
 * SQL MIGRATION — Run this in Supabase SQL Editor:
 *
 * -- subscription_plans
 * CREATE TABLE subscription_plans (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   slug TEXT UNIQUE NOT NULL,
 *   description TEXT,
 *   billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', '3months', '6months', 'yearly')),
 *   price INTEGER NOT NULL, -- VND
 *   original_price INTEGER, -- for showing discount
 *   features JSONB DEFAULT '[]',
 *   tier_granted TEXT DEFAULT 'member', -- what tier this grants
 *   is_active BOOLEAN DEFAULT true,
 *   sort_order INTEGER DEFAULT 0,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * -- user_subscriptions
 * CREATE TABLE user_subscriptions (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) NOT NULL,
 *   plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
 *   status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
 *   current_period_start TIMESTAMPTZ NOT NULL,
 *   current_period_end TIMESTAMPTZ NOT NULL,
 *   order_id UUID REFERENCES orders(id),
 *   payment_method TEXT,
 *   cancelled_at TIMESTAMPTZ,
 *   cancel_reason TEXT,
 *   auto_renew BOOLEAN DEFAULT false,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
 * CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
 */

import { createAdminClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────────────

export type BillingPeriod = "monthly" | "3months" | "6months" | "yearly";

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  billing_period: BillingPeriod;
  price: number;
  original_price: number | null;
  features: string[];
  tier_granted: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: "active" | "expired" | "cancelled" | "pending";
  current_period_start: string;
  current_period_end: string;
  order_id: string | null;
  payment_method: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  subscription_plans?: SubscriptionPlan;
}

// ─── Billing period labels (Vietnamese) ─────────────────────────────────────

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "Hàng tháng",
  "3months": "3 tháng",
  "6months": "6 tháng",
  yearly: "1 năm",
};

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Get a user's active subscription (active or cancelled but not yet expired).
 * Returns null if no active subscription found.
 */
export async function getActiveSubscription(
  userId: string
): Promise<UserSubscription | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*, subscription_plans(*)")
    .eq("user_id", userId)
    .in("status", ["active", "cancelled"])
    .gte("current_period_end", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[Subscription] Error fetching active subscription:", error.message);
    return null;
  }

  return data as UserSubscription | null;
}

/**
 * Check if user has an active subscription.
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const sub = await getActiveSubscription(userId);
  return sub !== null;
}

/**
 * Get all active subscription plans, sorted by sort_order.
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[Subscription] Error fetching plans:", error.message);
    return [];
  }

  return (data ?? []) as SubscriptionPlan[];
}

/**
 * Calculate expiry date based on billing period.
 */
export function calculateExpiryDate(
  startDate: Date,
  billingPeriod: BillingPeriod
): Date {
  const expiry = new Date(startDate);

  switch (billingPeriod) {
    case "monthly":
      expiry.setMonth(expiry.getMonth() + 1);
      break;
    case "3months":
      expiry.setMonth(expiry.getMonth() + 3);
      break;
    case "6months":
      expiry.setMonth(expiry.getMonth() + 6);
      break;
    case "yearly":
      expiry.setFullYear(expiry.getFullYear() + 1);
      break;
  }

  return expiry;
}

/**
 * Cron job helper: expire past-due subscriptions and downgrade user tiers.
 * Call this periodically (e.g., every hour via Vercel Cron or external cron).
 */
export async function checkAndExpireSubscriptions(): Promise<{
  expired: number;
  downgraded: number;
}> {
  const supabase = await createAdminClient();
  const now = new Date().toISOString();

  // 1. Find all subscriptions that should be expired
  const { data: expiredSubs, error: fetchError } = await supabase
    .from("user_subscriptions")
    .select("id, user_id, plan_id, status")
    .in("status", ["active", "cancelled"])
    .lt("current_period_end", now);

  if (fetchError) {
    console.error("[Subscription Cron] Error fetching expired subs:", fetchError.message);
    return { expired: 0, downgraded: 0 };
  }

  if (!expiredSubs || expiredSubs.length === 0) {
    return { expired: 0, downgraded: 0 };
  }

  let expiredCount = 0;
  let downgradedCount = 0;

  for (const sub of expiredSubs) {
    // 2. Update subscription status to expired
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({
        status: "expired",
        updated_at: now,
      })
      .eq("id", sub.id);

    if (updateError) {
      console.error(`[Subscription Cron] Error expiring sub ${sub.id}:`, updateError.message);
      continue;
    }
    expiredCount++;

    // 3. Check if user has any OTHER active subscription
    const { data: otherActive } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", sub.user_id)
      .eq("status", "active")
      .gte("current_period_end", now)
      .limit(1)
      .maybeSingle();

    // 4. If no other active sub, downgrade tier to free
    if (!otherActive) {
      const { error: tierError } = await supabase
        .from("profiles")
        .update({ tier: "free" })
        .eq("id", sub.user_id);

      if (!tierError) {
        downgradedCount++;
        console.log(`[Subscription Cron] Downgraded user ${sub.user_id} to free tier`);
      }
    }
  }

  console.log(
    `[Subscription Cron] Expired ${expiredCount} subscriptions, downgraded ${downgradedCount} users`
  );
  return { expired: expiredCount, downgraded: downgradedCount };
}
