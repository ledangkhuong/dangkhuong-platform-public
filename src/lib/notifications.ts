import { SupabaseClient } from "@supabase/supabase-js";

/** Create a personal notification for a specific user */
export async function createNotification(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  return supabase
    .from("notifications")
    .insert({ user_id: userId, type, title, message, link });
}

/** Create a broadcast announcement visible to ALL users */
export async function createAnnouncement(
  supabase: SupabaseClient,
  type: string,
  title: string,
  message: string,
  link?: string,
  createdBy?: string
) {
  return supabase
    .from("announcements")
    .insert({ type, title, message, link, created_by: createdBy });
}

/** Send personal notification to multiple users at once */
export async function createNotificationBulk(
  supabase: SupabaseClient,
  userIds: string[],
  type: string,
  title: string,
  message: string,
  link?: string
) {
  const rows = userIds.map((user_id) => ({
    user_id,
    type,
    title,
    message,
    link,
  }));
  return supabase.from("notifications").insert(rows);
}
