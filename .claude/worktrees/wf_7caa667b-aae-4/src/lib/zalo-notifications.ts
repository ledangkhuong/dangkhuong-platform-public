import { sendPurchaseNotification, isZaloOAConfigured } from "@/lib/zalo-oa";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Send Zalo notification on purchase (non-blocking)
 * Called from sepay webhook after payment confirmed
 */
export async function notifyPurchaseViaZalo(
  userId: string,
  customerName: string,
  productName: string,
  amount: number,
  orderCode: string
): Promise<void> {
  if (!isZaloOAConfigured()) return;

  try {
    const supabase = await createAdminClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("zalo_user_id")
      .eq("id", userId)
      .single();

    if (!profile?.zalo_user_id) return;

    const result = await sendPurchaseNotification(
      profile.zalo_user_id,
      customerName,
      productName,
      amount,
      orderCode
    );

    if (!result.success) {
      console.warn("[Zalo] Purchase notification failed:", result.error);
    } else {
      console.log("[Zalo] Purchase notification sent:", result.message_id);
    }
  } catch (err) {
    console.warn("[Zalo] Failed to send purchase notification:", err);
  }
}
