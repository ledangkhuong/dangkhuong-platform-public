/**
 * Inventory Alerts — Low Stock Notifications
 *
 * Cung cấp:
 *   - checkLowStock(): query các product_variants có stock_count <= low_stock_threshold
 *   - sendLowStockAlert(adminEmail, variants): build HTML email + gửi qua AWS SES
 *
 * Dùng createAdminClient để bypass RLS (cron / server action).
 */

import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/ses";
import type { SendResult } from "@/lib/email/types";

// ─── Types ───────────────────────────────────────────────────

export interface LowStockVariant {
  variant_id: string;
  variant_name: string | null;
  variant_sku: string | null;
  stock_count: number;
  low_stock_threshold: number;
  product_id: string;
  product_name: string | null;
  product_slug: string | null;
}

// ─── Query: Low Stock Variants ───────────────────────────────

/**
 * Query danh sách variant đang ở mức tồn kho thấp hoặc đã hết.
 * stock_count <= low_stock_threshold (và threshold > 0).
 */
export async function checkLowStock(): Promise<LowStockVariant[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      `
        id,
        name,
        sku,
        stock_count,
        low_stock_threshold,
        product_id,
        products:product_id (
          id,
          name,
          slug,
          status
        )
      `
    )
    .gt("low_stock_threshold", 0)
    .order("stock_count", { ascending: true });

  if (error) {
    console.error("[alerts.checkLowStock] Query lỗi:", error.message);
    return [];
  }

  if (!data) return [];

  // Filter ở app-layer: stock_count <= low_stock_threshold
  // (Supabase JS không hỗ trợ so sánh 2 cột trực tiếp trong .filter())
  const rows = data
    .filter((row: any) => {
      const stock = Number(row.stock_count ?? 0);
      const threshold = Number(row.low_stock_threshold ?? 0);
      const productStatus = row.products?.status;
      // Bỏ qua product đã archived
      if (productStatus === "archived") return false;
      return threshold > 0 && stock <= threshold;
    })
    .map((row: any): LowStockVariant => ({
      variant_id: row.id,
      variant_name: row.name,
      variant_sku: row.sku,
      stock_count: Number(row.stock_count ?? 0),
      low_stock_threshold: Number(row.low_stock_threshold ?? 0),
      product_id: row.product_id,
      product_name: row.products?.name ?? null,
      product_slug: row.products?.slug ?? null,
    }));

  return rows;
}

// ─── Email Builder ───────────────────────────────────────────

function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLowStockHtml(variants: LowStockVariant[]): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dangkhuong.com";
  const inventoryUrl = `${siteUrl}/admin/products/inventory`;

  const rows = variants
    .map((v) => {
      const stockStyle =
        v.stock_count <= 0
          ? "color:#ef4444;font-weight:700"
          : "color:#f59e0b;font-weight:600";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#e5e5e5">
            ${escapeHtml(v.product_name) || "<em style='color:#888'>(không tên)</em>"}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#bdbdbd">
            ${escapeHtml(v.variant_name) || "—"}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#bdbdbd;font-family:monospace;font-size:12px">
            ${escapeHtml(v.variant_sku) || "—"}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:right;${stockStyle}">
            ${v.stock_count}
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;text-align:right;color:#888">
            ${v.low_stock_threshold}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Cảnh báo tồn kho thấp</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e5e5e5">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0a;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:24px 28px;border-bottom:2px solid #D4A843">
              <h1 style="margin:0;font-size:20px;color:#D4A843;font-weight:700">
                ⚠️ Cảnh báo tồn kho thấp
              </h1>
              <p style="margin:6px 0 0;color:#bdbdbd;font-size:14px">
                Có <strong style="color:#D4A843">${variants.length}</strong> phiên bản sản phẩm cần re-stock ngay.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px">
                <thead>
                  <tr style="background:#0f0f0f">
                    <th align="left" style="padding:10px 12px;color:#D4A843;font-weight:600;border-bottom:1px solid #2a2a2a">Sản phẩm</th>
                    <th align="left" style="padding:10px 12px;color:#D4A843;font-weight:600;border-bottom:1px solid #2a2a2a">Phiên bản</th>
                    <th align="left" style="padding:10px 12px;color:#D4A843;font-weight:600;border-bottom:1px solid #2a2a2a">SKU</th>
                    <th align="right" style="padding:10px 12px;color:#D4A843;font-weight:600;border-bottom:1px solid #2a2a2a">Tồn</th>
                    <th align="right" style="padding:10px 12px;color:#D4A843;font-weight:600;border-bottom:1px solid #2a2a2a">Ngưỡng</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px" align="center">
              <a href="${inventoryUrl}"
                 style="display:inline-block;background:#D4A843;color:#0a0a0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                Quản lý tồn kho →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#0f0f0f;border-top:1px solid #2a2a2a">
              <p style="margin:0;color:#888;font-size:12px;line-height:1.5">
                Email này được gửi tự động từ hệ thống quản lý kho của dangkhuong.com.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function buildLowStockText(variants: LowStockVariant[]): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dangkhuong.com";
  const lines = variants.map(
    (v) =>
      `- ${v.product_name ?? "(không tên)"} / ${v.variant_name ?? "—"} ` +
      `[SKU: ${v.variant_sku ?? "—"}] — tồn: ${v.stock_count} (ngưỡng: ${v.low_stock_threshold})`
  );
  return [
    `CẢNH BÁO TỒN KHO THẤP — ${variants.length} sản phẩm`,
    "",
    ...lines,
    "",
    `Quản lý tồn kho: ${siteUrl}/admin/products/inventory`,
  ].join("\n");
}

// ─── Public: Send Alert ──────────────────────────────────────

/**
 * Gửi cảnh báo tồn kho thấp đến admin email.
 * Nếu variants rỗng → no-op (trả về success).
 */
export async function sendLowStockAlert(
  adminEmail: string,
  variants: LowStockVariant[]
): Promise<SendResult> {
  if (!adminEmail) {
    return { success: false, error: "Missing adminEmail" };
  }
  if (!variants || variants.length === 0) {
    return { success: true, messageId: "no-op:empty-variants" };
  }

  const subject = `⚠️ Cảnh báo tồn kho thấp - ${variants.length} sản phẩm`;
  const html = buildLowStockHtml(variants);
  const text = buildLowStockText(variants);

  return sendEmail(adminEmail, subject, html, text);
}
