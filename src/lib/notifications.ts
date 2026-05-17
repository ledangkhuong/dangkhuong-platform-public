import { SupabaseClient } from "@supabase/supabase-js";

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
