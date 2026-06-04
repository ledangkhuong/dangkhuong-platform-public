/**
 * Attribution sync helper — kết nối visitor_attribution (first-touch) vào
 * crm_contacts + orders khi user convert.
 *
 * Cách dùng (server-only, sau khi tạo order/lead):
 *   await syncAttributionToConversion({
 *     visitorId: req.cookies.get("dk_vid")?.value,
 *     email: "user@gmail.com",
 *     orderId: order.id,
 *     fullName: "Nguyễn Văn A",
 *     phone: "0901234567",
 *   });
 */

import { createAdminClient } from "@/lib/supabase/server";
import { isValidVisitorId } from "@/lib/visitor-id";

interface SyncOpts {
  visitorId: string | null | undefined;
  email: string | null | undefined;
  orderId?: string;
  fullName?: string | null;
  phone?: string | null;
}

export async function syncAttributionToConversion(opts: SyncOpts): Promise<void> {
  const { visitorId, email, orderId, fullName, phone } = opts;
  if (!isValidVisitorId(visitorId)) return;
  if (!email && !orderId) return;

  try {
    const admin = await createAdminClient();

    // 1. Fetch visitor_attribution (frozen first-touch)
    const { data: attr } = await admin
      .from("visitor_attribution")
      .select("*")
      .eq("visitor_id", visitorId)
      .maybeSingle();

    if (!attr) return; // No attribution recorded — visitor never PageView'd

    const snapshot = {
      visitor_id: visitorId,
      utm_source: attr.utm_source,
      utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign,
      utm_term: attr.utm_term,
      utm_content: attr.utm_content,
      fbclid: attr.fbclid,
      gclid: attr.gclid,
      ttclid: attr.ttclid,
      referrer: attr.referrer,
      first_page: attr.first_landing_path,
      first_landing_path: attr.first_landing_path,
      device_type: attr.device_type,
      country: attr.country,
      country_code: attr.country_code,
      city: attr.city,
      ref_code: attr.ref_code,
    };

    // 2. Update orders row with attribution (if orderId)
    if (orderId) {
      await admin
        .from("orders")
        .update({
          visitor_id: visitorId,
          utm_source: attr.utm_source,
          utm_medium: attr.utm_medium,
          utm_campaign: attr.utm_campaign,
          utm_term: attr.utm_term,
          utm_content: attr.utm_content,
          fbclid: attr.fbclid,
          gclid: attr.gclid,
          referrer: attr.referrer,
          landing_path: attr.first_landing_path,
        })
        .eq("id", orderId);
    }

    // 3. Upsert crm_contacts by email với attribution
    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: existing } = await admin
        .from("crm_contacts")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existing) {
        // Update — chỉ set field attribution nếu hiện đang null (preserve first-touch)
        await admin
          .from("crm_contacts")
          .update({
            visitor_id: snapshot.visitor_id,
            utm_source: snapshot.utm_source,
            utm_medium: snapshot.utm_medium,
            utm_campaign: snapshot.utm_campaign,
            fbclid: snapshot.fbclid,
            gclid: snapshot.gclid,
            ttclid: snapshot.ttclid,
            referrer: snapshot.referrer,
            first_page: snapshot.first_page,
            first_landing_path: snapshot.first_landing_path,
            device_type: snapshot.device_type,
            country: snapshot.country,
            country_code: snapshot.country_code,
            city: snapshot.city,
            ref_code: snapshot.ref_code,
          })
          .eq("id", existing.id);
      } else {
        // Insert mới
        await admin.from("crm_contacts").insert({
          full_name: fullName?.trim() || normalizedEmail,
          email: normalizedEmail,
          phone: phone?.trim() || null,
          source: attr.utm_source || "website",
          status: "new",
          ...snapshot,
        });
      }
    }
  } catch (err) {
    console.warn("[attribution] sync failed:", err);
  }
}
