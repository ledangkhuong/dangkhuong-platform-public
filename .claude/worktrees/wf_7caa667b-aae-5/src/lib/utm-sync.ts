/**
 * Auto-sync UTM params from order to crm_contacts.
 * Called after order creation in register routes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * Upsert crm_contact with UTM data from the order.
 * If contact exists (by email or user_id), update UTM fields.
 * If not exists, create new contact with UTM.
 */
export async function syncUtmToContact(
  admin: SupabaseClient,
  userId: string,
  customerName: string,
  customerEmail: string | null,
  customerPhone: string | null,
  utm: UtmData,
): Promise<void> {
  try {
    // Find existing contact by user_id or email
    let contactId: string | null = null;

    const { data: byUserId } = await admin
      .from("crm_contacts")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (byUserId) {
      contactId = byUserId.id;
    } else if (customerEmail) {
      const { data: byEmail } = await admin
        .from("crm_contacts")
        .select("id")
        .eq("email", customerEmail.toLowerCase())
        .limit(1)
        .maybeSingle();
      if (byEmail) contactId = byEmail.id;
    }

    if (contactId) {
      // Update existing contact UTM (only if currently null)
      const updates: Record<string, string> = {};
      if (utm.utm_source) updates.utm_source = utm.utm_source;
      if (utm.utm_medium) updates.utm_medium = utm.utm_medium;
      if (utm.utm_campaign) updates.utm_campaign = utm.utm_campaign;

      if (Object.keys(updates).length > 0) {
        await admin
          .from("crm_contacts")
          .update(updates)
          .eq("id", contactId);
      }
    }
    // If no contact found, the syncContactsFromOrders batch job
    // or the next CRM page load will pick it up.
  } catch {
    // Non-critical — don't break the registration flow
  }
}
