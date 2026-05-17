import { createAdminClient } from "@/lib/supabase/server";

export type AuditAction =
  | "user.delete"
  | "user.role_change"
  | "user.tier_change"
  | "order.confirm"
  | "order.delete"
  | "course.delete"
  | "course.duplicate"
  | "enrollment.create"
  | "enrollment.delete"
  | "email.campaign_send"
  | "payment.received"
  | "account.delete";

interface AuditLogEntry {
  admin_id: string;
  admin_email?: string;
  action: AuditAction;
  target_type: string; // "user", "order", "course", etc.
  target_id: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

/**
 * Log an admin action to the audit_logs table.
 * Best-effort: errors are caught and logged, never thrown.
 *
 * PREREQUISITE: Create the audit_logs table in Supabase SQL Editor:
 *
 * CREATE TABLE IF NOT EXISTS audit_logs (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   admin_id UUID REFERENCES auth.users(id),
 *   admin_email TEXT,
 *   action TEXT NOT NULL,
 *   target_type TEXT NOT NULL,
 *   target_id TEXT NOT NULL,
 *   details JSONB DEFAULT '{}',
 *   ip_address TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
 * CREATE INDEX idx_audit_logs_action ON audit_logs(action);
 * CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
 *
 * -- RLS: Only admins can read audit logs
 * ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Admins can read audit logs" ON audit_logs
 *   FOR SELECT USING (
 *     EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager'))
 *   );
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createAdminClient();
    await supabase.from("audit_logs").insert({
      admin_id: entry.admin_id,
      admin_email: entry.admin_email || null,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
    });
  } catch (err) {
    // Best-effort: never let audit logging break the main operation
    console.error("[Audit] Failed to log:", entry.action, err);
  }
}
