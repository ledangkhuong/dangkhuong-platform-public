/**
 * Email Automation Types
 * Type definitions for the automation/workflow system.
 */

// ─── Node Types for Flow Builder ────────────────────────────

export type AutomationNodeType =
  | "trigger"
  | "sendEmail"
  | "wait"
  | "condition"
  | "addTag"
  | "removeTag"
  | "moveToList"
  | "webhook"
  | "end";

export type TriggerType =
  | "tag_added"
  | "subscribed_to_list"
  | "manual"
  | "purchase"
  | "form_submit";

export type AutomationStatus = "draft" | "active" | "paused" | "archived";

export type EnrollmentStatus = "active" | "completed" | "paused" | "exited" | "waiting";

// ─── Flow Node Data ─────────────────────────────────────────

export interface TriggerNodeData {
  triggerType: TriggerType;
  config: {
    tag?: string;
    listId?: string;
    productId?: string;
    formId?: string;
  };
}

export interface SendEmailNodeData {
  subject: string;
  templateId?: string;
  htmlContent?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface WaitNodeData {
  days: number;
  hours: number;
  minutes: number;
}

export interface ConditionNodeData {
  conditionType: "opened_email" | "clicked_link" | "has_tag" | "in_list" | "custom_field";
  config: {
    stepId?: string; // Reference to a previous email step
    tag?: string;
    listId?: string;
    field?: string;
    operator?: "equals" | "contains" | "not_equals" | "greater_than" | "less_than";
    value?: string;
  };
}

export interface AddTagNodeData {
  tagName: string;
}

export interface RemoveTagNodeData {
  tagName: string;
}

export interface MoveToListNodeData {
  listId: string;
  listName?: string;
}

export interface WebhookNodeData {
  url: string;
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

export type FlowNodeData =
  | TriggerNodeData
  | SendEmailNodeData
  | WaitNodeData
  | ConditionNodeData
  | AddTagNodeData
  | RemoveTagNodeData
  | MoveToListNodeData
  | WebhookNodeData
  | Record<string, never>; // for end node

// ─── Flow Definition ────────────────────────────────────────

export interface FlowNode {
  id: string;
  type: AutomationNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // 'yes' or 'no' for condition nodes
  label?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// ─── Database Models ────────────────────────────────────────

export interface EmailTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailAutomation {
  id: string;
  name: string;
  description: string | null;
  status: AutomationStatus;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  flow_definition: FlowDefinition;
  enrolled_count: number;
  completed_count: number;
  active_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAutomationStep {
  id: string;
  automation_id: string;
  step_order: number;
  step_type: AutomationNodeType;
  config: Record<string, unknown>;
  next_step_id: string | null;
  yes_step_id: string | null;
  no_step_id: string | null;
  created_at: string;
}

export interface EmailAutomationEnrollment {
  id: string;
  automation_id: string;
  subscriber_id: string;
  current_step_id: string | null;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  next_action_at: string | null;
  step_data: Record<string, unknown>;
  created_at: string;
}

export interface EmailAutomationLog {
  id: string;
  enrollment_id: string | null;
  automation_id: string;
  subscriber_id: string;
  step_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── API Response Types ─────────────────────────────────────

export interface AutomationListItem {
  id: string;
  name: string;
  description: string | null;
  status: AutomationStatus;
  trigger_type: TriggerType;
  enrolled_count: number;
  completed_count: number;
  active_count: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationDetail extends EmailAutomation {
  steps?: EmailAutomationStep[];
  recent_logs?: EmailAutomationLog[];
}
