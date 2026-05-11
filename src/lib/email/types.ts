/**
 * Email Marketing Types
 * Type definitions for the email marketing system:
 * subscribers, lists, templates, campaigns, sends, events, and batch processing.
 */

// ─── Subscriber ──────────────────────────────────────────────

/** Row in `subscribers` table */
export interface Subscriber {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: "active" | "unsubscribed" | "bounced" | "complained";
  source: string;
  tags: string[];
  metadata: Record<string, unknown>;
  user_id: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Email List ──────────────────────────────────────────────

/** Row in `email_lists` table */
export interface EmailList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
}

/** Join table row: subscriber <-> list */
export interface EmailListSubscriber {
  list_id: string;
  subscriber_id: string;
  added_at: string;
}

// ─── Email Template ──────────────────────────────────────────

/** Row in `email_templates` table */
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  category: string;
  variables: string[];
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Email Campaign ──────────────────────────────────────────

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "cancelled";

/** Row in `email_campaigns` table */
export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  html_content: string;
  text_content: string | null;
  template_id: string | null;
  list_id: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  complaint_count: number;
  unsubscribe_count: number;
  tags: string[];
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Email Send ──────────────────────────────────────────────

export type SendStatus = "queued" | "sending" | "sent" | "failed" | "bounced";

/** One send record: a specific email sent to a specific subscriber within a campaign */
export interface EmailSend {
  id: string;
  campaign_id: string;
  subscriber_id: string;
  email: string;
  status: string;
  ses_message_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Email Event ──────────────────────────────────────────────

export type EmailEventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed";

/** Granular email event for detailed tracking */
export interface EmailEvent {
  id: string;
  send_id: string;
  campaign_id: string;
  subscriber_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─── Function Params & Results ───────────────────────────────

/** Parameters for sending a single email via SES */
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  /** SES message tags for tracking */
  tags?: Record<string, string>;
  /** Extra headers (e.g. List-Unsubscribe) */
  headers?: Record<string, string>;
}

/** Params for bulk email entries (legacy) */
export interface BulkEmailEntry {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Result of sending a single email */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/** Result of sending bulk emails */
export interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

/** Result of processing a batch of queued sends */
export interface BatchResult {
  sent: number;
  failed: number;
  remaining: number;
  completed: boolean;
  errors: string[];
}

/** Real-time progress of a campaign send */
export interface CampaignProgress {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  percentage: number;
}

/** Campaign statistics (aggregated) */
export interface CampaignStats {
  campaign_id: string;
  total_recipients: number;
  sent: number;
  failed: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
}

/** Default template variables resolved per-subscriber */
export interface TemplateVariables {
  name: string;
  full_name: string;
  email: string;
  first_name: string;
  unsubscribe_url: string;
  company_name: string;
  current_year: string;
  subscriber_id: string;
  [key: string]: string;
}
