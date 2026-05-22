/**
 * Automation Triggers
 * Call these functions when events happen to auto-enroll subscribers
 * into matching active automations.
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Called when a tag is added to a subscriber.
 * Finds all active automations with trigger_type='tag_added' and matching tag,
 * then enrolls the subscriber if not already enrolled.
 */
export async function onTagAdded(
  adminClient: SupabaseClient,
  subscriberId: string,
  tagName: string
): Promise<{ enrolled: string[] }> {
  // Find matching automations
  const { data: automations } = await adminClient
    .from("email_automations")
    .select("id, trigger_config")
    .eq("status", "active")
    .eq("trigger_type", "tag_added");

  const enrolled: string[] = [];

  for (const auto of automations || []) {
    const config = auto.trigger_config as { tag?: string };
    if (config.tag !== tagName) continue;

    // Check if already enrolled
    const { data: existing } = await adminClient
      .from("email_automation_enrollments")
      .select("id")
      .eq("automation_id", auto.id)
      .eq("subscriber_id", subscriberId)
      .single();

    if (existing) continue;

    // Enroll
    await adminClient.from("email_automation_enrollments").insert({
      automation_id: auto.id,
      subscriber_id: subscriberId,
      status: "active",
      enrolled_at: new Date().toISOString(),
    });

    // Log
    await adminClient.from("email_automation_logs").insert({
      automation_id: auto.id,
      subscriber_id: subscriberId,
      action: "enrolled",
      metadata: { trigger: "tag_added", tag: tagName },
    });

    // Update enrolled count
    const { data: current } = await adminClient
      .from("email_automations")
      .select("enrolled_count")
      .eq("id", auto.id)
      .single();

    await adminClient
      .from("email_automations")
      .update({ enrolled_count: (current?.enrolled_count || 0) + 1 })
      .eq("id", auto.id);

    enrolled.push(auto.id);
  }

  return { enrolled };
}

/**
 * Called when a subscriber is added to a list.
 */
export async function onSubscribedToList(
  adminClient: SupabaseClient,
  subscriberId: string,
  listId: string
): Promise<{ enrolled: string[] }> {
  const { data: automations } = await adminClient
    .from("email_automations")
    .select("id, trigger_config")
    .eq("status", "active")
    .eq("trigger_type", "subscribed_to_list");

  const enrolled: string[] = [];

  for (const auto of automations || []) {
    const config = auto.trigger_config as { listId?: string };
    if (config.listId !== listId) continue;

    const { data: existing } = await adminClient
      .from("email_automation_enrollments")
      .select("id")
      .eq("automation_id", auto.id)
      .eq("subscriber_id", subscriberId)
      .single();

    if (existing) continue;

    await adminClient.from("email_automation_enrollments").insert({
      automation_id: auto.id,
      subscriber_id: subscriberId,
      status: "active",
      enrolled_at: new Date().toISOString(),
    });

    await adminClient.from("email_automation_logs").insert({
      automation_id: auto.id,
      subscriber_id: subscriberId,
      action: "enrolled",
      metadata: { trigger: "subscribed_to_list", listId },
    });

    enrolled.push(auto.id);
  }

  return { enrolled };
}

/**
 * Called when a purchase is completed.
 */
export async function onPurchase(
  adminClient: SupabaseClient,
  subscriberId: string,
  productId: string
): Promise<{ enrolled: string[] }> {
  const { data: automations } = await adminClient
    .from("email_automations")
    .select("id, trigger_config")
    .eq("status", "active")
    .eq("trigger_type", "purchase");

  const enrolled: string[] = [];

  for (const auto of automations || []) {
    const config = auto.trigger_config as { productId?: string };
    // If productId is specified in config, must match. If not specified, trigger for any purchase.
    if (config.productId && config.productId !== productId) continue;

    const { data: existing } = await adminClient
      .from("email_automation_enrollments")
      .select("id")
      .eq("automation_id", auto.id)
      .eq("subscriber_id", subscriberId)
      .single();

    if (existing) continue;

    await adminClient.from("email_automation_enrollments").insert({
      automation_id: auto.id,
      subscriber_id: subscriberId,
      status: "active",
      enrolled_at: new Date().toISOString(),
    });

    await adminClient.from("email_automation_logs").insert({
      automation_id: auto.id,
      subscriber_id: subscriberId,
      action: "enrolled",
      metadata: { trigger: "purchase", productId },
    });

    enrolled.push(auto.id);
  }

  return { enrolled };
}
