/**
 * Email Automation Processor
 * Core engine that processes automation enrollments by advancing subscribers
 * through their automation flow steps.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  FlowDefinition,
  FlowNode,
  SendEmailNodeData,
  WaitNodeData,
  ConditionNodeData,
  AddTagNodeData,
  RemoveTagNodeData,
} from "./automation-types";
import { sendSingleEmail } from "./send-engine";

// ─── Constants ──────────────────────────────────────────────

const MAX_RECURSION_DEPTH = 10;

// ─── Main Processing Function ───────────────────────────────

/**
 * Process all automation enrollments that are ready for their next action.
 * Queries enrollments with status='waiting' and next_action_at <= now().
 */
export async function processAutomations(
  adminClient: SupabaseClient
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  const { data: enrollments, error: fetchError } = await adminClient
    .from("email_automation_enrollments")
    .select("*")
    .eq("status", "waiting")
    .lte("next_action_at", new Date().toISOString());

  if (fetchError) {
    return { processed: 0, errors: [`Failed to fetch enrollments: ${fetchError.message}`] };
  }

  if (!enrollments || enrollments.length === 0) {
    return { processed: 0, errors: [] };
  }

  for (const enrollment of enrollments) {
    try {
      await processEnrollmentStep(adminClient, enrollment);
      processed++;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      errors.push(`Enrollment ${enrollment.id}: ${errorMessage}`);

      // Log the error to automation_logs
      await adminClient.from("email_automation_logs").insert({
        enrollment_id: enrollment.id,
        automation_id: enrollment.automation_id,
        subscriber_id: enrollment.subscriber_id,
        step_id: enrollment.current_step_id,
        action: "error",
        metadata: { error: errorMessage },
      });
    }
  }

  return { processed, errors };
}

// ─── Process Single Enrollment Step ─────────────────────────

/**
 * Process the current step for a single enrollment.
 * Fetches the automation flow definition, finds the current node,
 * and executes the appropriate action based on node type.
 */
export async function processEnrollmentStep(
  adminClient: SupabaseClient,
  enrollment: any,
  depth: number = 0
): Promise<void> {
  // Fetch the automation's flow definition
  const { data: automation, error: autoError } = await adminClient
    .from("email_automations")
    .select("flow_definition")
    .eq("id", enrollment.automation_id)
    .single();

  if (autoError || !automation) {
    throw new Error(`Failed to fetch automation: ${autoError?.message || "not found"}`);
  }

  const flowDef: FlowDefinition = automation.flow_definition;

  // Find the current step node
  const currentNode = flowDef.nodes.find(
    (node) => node.id === enrollment.current_step_id
  );

  if (!currentNode) {
    throw new Error(`Current step node not found: ${enrollment.current_step_id}`);
  }

  // Process based on node type
  switch (currentNode.type) {
    case "sendEmail":
      await handleSendEmail(adminClient, enrollment, currentNode, flowDef, depth);
      break;

    case "wait":
      await handleWait(adminClient, enrollment, currentNode);
      break;

    case "condition":
      await handleCondition(adminClient, enrollment, currentNode, flowDef, depth);
      break;

    case "addTag":
      await handleAddTag(adminClient, enrollment, currentNode, flowDef, depth);
      break;

    case "removeTag":
      await handleRemoveTag(adminClient, enrollment, currentNode, flowDef, depth);
      break;

    case "end":
      await handleEnd(adminClient, enrollment);
      break;

    default:
      throw new Error(`Unknown node type: ${currentNode.type}`);
  }
}

// ─── Node Type Handlers ─────────────────────────────────────

async function handleSendEmail(
  adminClient: SupabaseClient,
  enrollment: any,
  node: FlowNode,
  flowDef: FlowDefinition,
  depth: number
): Promise<void> {
  const nodeData = node.data as SendEmailNodeData;

  // Get subscriber email
  const { data: subscriber, error: subError } = await adminClient
    .from("subscribers")
    .select("email, first_name, last_name")
    .eq("id", enrollment.subscriber_id)
    .single();

  if (subError || !subscriber) {
    throw new Error(`Failed to fetch subscriber: ${subError?.message || "not found"}`);
  }

  // Send the email
  await sendSingleEmail({
    to: subscriber.email,
    subject: nodeData.subject,
    html: nodeData.htmlContent || "",
    fromName: nodeData.fromName,
    fromEmail: nodeData.fromEmail,
    tags: {
      automation_id: enrollment.automation_id,
      enrollment_id: enrollment.id,
      step_id: node.id,
    },
  });

  // Log the action
  await adminClient.from("email_automation_logs").insert({
    enrollment_id: enrollment.id,
    automation_id: enrollment.automation_id,
    subscriber_id: enrollment.subscriber_id,
    step_id: node.id,
    action: "email_sent",
    metadata: { subject: nodeData.subject, to: subscriber.email },
  });

  // Move to next step
  const nextNode = getNextNode(flowDef, node.id);
  await advanceToNextStep(adminClient, enrollment, nextNode, depth);
}

async function handleWait(
  adminClient: SupabaseClient,
  enrollment: any,
  node: FlowNode
): Promise<void> {
  const nodeData = node.data as WaitNodeData;

  // Calculate next_action_at
  const now = new Date();
  const waitMs =
    (nodeData.days || 0) * 86400000 +
    (nodeData.hours || 0) * 3600000 +
    (nodeData.minutes || 0) * 60000;
  const nextActionAt = new Date(now.getTime() + waitMs);

  // Update enrollment
  await adminClient
    .from("email_automation_enrollments")
    .update({
      status: "waiting",
      next_action_at: nextActionAt.toISOString(),
    })
    .eq("id", enrollment.id);

  // Log the action
  await adminClient.from("email_automation_logs").insert({
    enrollment_id: enrollment.id,
    automation_id: enrollment.automation_id,
    subscriber_id: enrollment.subscriber_id,
    step_id: node.id,
    action: "wait_started",
    metadata: {
      days: nodeData.days,
      hours: nodeData.hours,
      minutes: nodeData.minutes,
      next_action_at: nextActionAt.toISOString(),
    },
  });
}

async function handleCondition(
  adminClient: SupabaseClient,
  enrollment: any,
  node: FlowNode,
  flowDef: FlowDefinition,
  depth: number
): Promise<void> {
  const nodeData = node.data as ConditionNodeData;

  // Evaluate the condition
  const result = await evaluateCondition(adminClient, enrollment, nodeData);

  // Follow yes or no edge
  const handle = result ? "yes" : "no";
  const nextNode = getNextNode(flowDef, node.id, handle);

  // Log the action
  await adminClient.from("email_automation_logs").insert({
    enrollment_id: enrollment.id,
    automation_id: enrollment.automation_id,
    subscriber_id: enrollment.subscriber_id,
    step_id: node.id,
    action: result ? "condition_yes" : "condition_no",
    metadata: {
      conditionType: nodeData.conditionType,
      config: nodeData.config,
      result,
    },
  });

  // Advance to next step
  await advanceToNextStep(adminClient, enrollment, nextNode, depth);
}

async function handleAddTag(
  adminClient: SupabaseClient,
  enrollment: any,
  node: FlowNode,
  flowDef: FlowDefinition,
  depth: number
): Promise<void> {
  const nodeData = node.data as AddTagNodeData;

  // Get subscriber's current tags
  const { data: subscriber, error: subError } = await adminClient
    .from("subscribers")
    .select("tags")
    .eq("id", enrollment.subscriber_id)
    .single();

  if (subError || !subscriber) {
    throw new Error(`Failed to fetch subscriber: ${subError?.message || "not found"}`);
  }

  // Add tag if not already present
  const currentTags: string[] = subscriber.tags || [];
  if (!currentTags.includes(nodeData.tagName)) {
    currentTags.push(nodeData.tagName);
    await adminClient
      .from("subscribers")
      .update({ tags: currentTags })
      .eq("id", enrollment.subscriber_id);
  }

  // Log the action
  await adminClient.from("email_automation_logs").insert({
    enrollment_id: enrollment.id,
    automation_id: enrollment.automation_id,
    subscriber_id: enrollment.subscriber_id,
    step_id: node.id,
    action: "tag_added",
    metadata: { tag: nodeData.tagName },
  });

  // Move to next step
  const nextNode = getNextNode(flowDef, node.id);
  await advanceToNextStep(adminClient, enrollment, nextNode, depth);
}

async function handleRemoveTag(
  adminClient: SupabaseClient,
  enrollment: any,
  node: FlowNode,
  flowDef: FlowDefinition,
  depth: number
): Promise<void> {
  const nodeData = node.data as RemoveTagNodeData;

  // Get subscriber's current tags
  const { data: subscriber, error: subError } = await adminClient
    .from("subscribers")
    .select("tags")
    .eq("id", enrollment.subscriber_id)
    .single();

  if (subError || !subscriber) {
    throw new Error(`Failed to fetch subscriber: ${subError?.message || "not found"}`);
  }

  // Remove tag
  const currentTags: string[] = subscriber.tags || [];
  const updatedTags = currentTags.filter((tag) => tag !== nodeData.tagName);

  if (updatedTags.length !== currentTags.length) {
    await adminClient
      .from("subscribers")
      .update({ tags: updatedTags })
      .eq("id", enrollment.subscriber_id);
  }

  // Log the action
  await adminClient.from("email_automation_logs").insert({
    enrollment_id: enrollment.id,
    automation_id: enrollment.automation_id,
    subscriber_id: enrollment.subscriber_id,
    step_id: node.id,
    action: "tag_removed",
    metadata: { tag: nodeData.tagName },
  });

  // Move to next step
  const nextNode = getNextNode(flowDef, node.id);
  await advanceToNextStep(adminClient, enrollment, nextNode, depth);
}

async function handleEnd(
  adminClient: SupabaseClient,
  enrollment: any
): Promise<void> {
  // Mark enrollment as completed
  await adminClient
    .from("email_automation_enrollments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", enrollment.id);

  // Update automation completed_count
  await adminClient.rpc("increment_field", {
    table_name: "email_automations",
    row_id: enrollment.automation_id,
    field_name: "completed_count",
    increment_by: 1,
  });

  // Log the action
  await adminClient.from("email_automation_logs").insert({
    enrollment_id: enrollment.id,
    automation_id: enrollment.automation_id,
    subscriber_id: enrollment.subscriber_id,
    step_id: null,
    action: "completed",
    metadata: {},
  });
}

// ─── Flow Navigation ────────────────────────────────────────

/**
 * Find the next node in the flow from the current node.
 * Optionally filter by sourceHandle (for condition yes/no branches).
 */
export function getNextNode(
  flowDef: FlowDefinition,
  currentNodeId: string,
  handle?: string
): FlowNode | null {
  // Find the edge from the current node
  const edge = flowDef.edges.find((e) => {
    if (e.source !== currentNodeId) return false;
    if (handle && e.sourceHandle !== handle) return false;
    return true;
  });

  if (!edge) return null;

  // Find and return the target node
  const targetNode = flowDef.nodes.find((node) => node.id === edge.target);
  return targetNode || null;
}

// ─── Condition Evaluation ───────────────────────────────────

/**
 * Evaluate a condition node based on its conditionType.
 */
export async function evaluateCondition(
  adminClient: SupabaseClient,
  enrollment: any,
  conditionData: ConditionNodeData
): Promise<boolean> {
  switch (conditionData.conditionType) {
    case "has_tag": {
      const { data: subscriber } = await adminClient
        .from("subscribers")
        .select("tags")
        .eq("id", enrollment.subscriber_id)
        .single();

      if (!subscriber) return false;
      const tags: string[] = subscriber.tags || [];
      return tags.includes(conditionData.config.tag || "");
    }

    case "opened_email": {
      const { data: sends } = await adminClient
        .from("email_sends")
        .select("opened_at")
        .eq("subscriber_id", enrollment.subscriber_id)
        .eq("automation_step_id", conditionData.config.stepId || "")
        .not("opened_at", "is", null)
        .limit(1);

      return (sends && sends.length > 0) || false;
    }

    case "clicked_link": {
      const { data: sends } = await adminClient
        .from("email_sends")
        .select("clicked_at")
        .eq("subscriber_id", enrollment.subscriber_id)
        .eq("automation_step_id", conditionData.config.stepId || "")
        .not("clicked_at", "is", null)
        .limit(1);

      return (sends && sends.length > 0) || false;
    }

    case "in_list": {
      const { data: membership } = await adminClient
        .from("email_list_subscribers")
        .select("id")
        .eq("subscriber_id", enrollment.subscriber_id)
        .eq("list_id", conditionData.config.listId || "")
        .limit(1);

      return (membership && membership.length > 0) || false;
    }

    default:
      return false;
  }
}

// ─── Step Advancement ───────────────────────────────────────

/**
 * Advance the enrollment to the next step.
 * If nextNode is null, complete the enrollment.
 * If nextNode is a wait node, set status='waiting' with calculated next_action_at.
 * Otherwise, update current_step_id and recursively process (max depth 10).
 */
export async function advanceToNextStep(
  adminClient: SupabaseClient,
  enrollment: any,
  nextNode: FlowNode | null,
  depth: number = 0
): Promise<void> {
  // Prevent infinite loops
  if (depth >= MAX_RECURSION_DEPTH) {
    await adminClient.from("email_automation_logs").insert({
      enrollment_id: enrollment.id,
      automation_id: enrollment.automation_id,
      subscriber_id: enrollment.subscriber_id,
      step_id: enrollment.current_step_id,
      action: "error",
      metadata: { error: "Max recursion depth reached", depth },
    });
    return;
  }

  // No next node means end of flow
  if (!nextNode) {
    await adminClient
      .from("email_automation_enrollments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);

    await adminClient.rpc("increment_field", {
      table_name: "email_automations",
      row_id: enrollment.automation_id,
      field_name: "completed_count",
      increment_by: 1,
    });

    await adminClient.from("email_automation_logs").insert({
      enrollment_id: enrollment.id,
      automation_id: enrollment.automation_id,
      subscriber_id: enrollment.subscriber_id,
      step_id: null,
      action: "completed",
      metadata: {},
    });
    return;
  }

  // If next node is a wait node, set up the wait
  if (nextNode.type === "wait") {
    const waitData = nextNode.data as WaitNodeData;
    const now = new Date();
    const waitMs =
      (waitData.days || 0) * 86400000 +
      (waitData.hours || 0) * 3600000 +
      (waitData.minutes || 0) * 60000;
    const nextActionAt = new Date(now.getTime() + waitMs);

    await adminClient
      .from("email_automation_enrollments")
      .update({
        current_step_id: nextNode.id,
        status: "waiting",
        next_action_at: nextActionAt.toISOString(),
      })
      .eq("id", enrollment.id);

    await adminClient.from("email_automation_logs").insert({
      enrollment_id: enrollment.id,
      automation_id: enrollment.automation_id,
      subscriber_id: enrollment.subscriber_id,
      step_id: nextNode.id,
      action: "wait_started",
      metadata: {
        days: waitData.days,
        hours: waitData.hours,
        minutes: waitData.minutes,
        next_action_at: nextActionAt.toISOString(),
      },
    });
    return;
  }

  // For other node types, update current_step_id and process immediately
  await adminClient
    .from("email_automation_enrollments")
    .update({
      current_step_id: nextNode.id,
    })
    .eq("id", enrollment.id);

  // Update the enrollment object for recursive processing
  const updatedEnrollment = { ...enrollment, current_step_id: nextNode.id };
  await processEnrollmentStep(adminClient, updatedEnrollment, depth + 1);
}
