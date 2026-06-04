/**
 * Pure constants and label helpers for crm_contacts.status.
 *
 * Kept OUTSIDE of `src/lib/actions/contact-status.ts` because that file
 * has `"use server"` at the top — Next.js 16 + Turbopack rejects any
 * non-async function export from a server-actions file. So the const,
 * type, label map, and the synchronous helper all live here, and both
 * client + server code import from this module.
 *
 * Kept in sync with the CHECK constraint in
 *   supabase/migrations/20260527_002_extend_contact_status.sql
 * which extends the original set with 'paused' and 'cold'.
 *
 * Note: 'churned' is intentionally NOT exposed in the UI — it's legacy.
 * `getContactStatusLabel` still renders it as "Rời bỏ" so any existing
 * rows continue to display correctly.
 */

export const CONTACT_STATUS_VALUES = [
  "new",
  "contacted",
  "qualified",
  "negotiation",
  "won",
  "lost",
  "paused",
  "cold",
] as const;

export type ContactStatus = (typeof CONTACT_STATUS_VALUES)[number];

const STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Khách mới",
  contacted: "Đã liên hệ",
  qualified: "Đủ điều kiện",
  negotiation: "Đàm phán",
  won: "Chốt thành công",
  lost: "Mất khách",
  paused: "Tạm dừng",
  cold: "Khách nguội",
};

/** Render a Vietnamese label for any status, including legacy 'churned'. */
export function getContactStatusLabel(status: string): string {
  if ((CONTACT_STATUS_VALUES as readonly string[]).includes(status)) {
    return STATUS_LABELS[status as ContactStatus];
  }
  if (status === "churned") return "Rời bỏ";
  return status;
}
