// ──────────────────────────────────────────────────────────────────────────────
// /admin/orders/physical/[id]/invoice — HOÁ ĐƠN BÁN HÀNG (Week 7)
// ──────────────────────────────────────────────────────────────────────────────
// Server Component dùng để in hoá đơn A4. Layout tối giản, mực đen trên nền
// trắng, ẩn toàn bộ sidebar/topbar khi `@media print`. Tự động trigger
// `window.print()` qua client wrapper `PrintOnMount` ngay sau khi mount.
//
// Lưu ý:
//  - File này nằm trong route group `(dashboard)`. Để ẩn dashboard layout khi
//    in, chúng ta dùng CSS `@media print { ... display:none }` trên các selector
//    `[data-print-hide]` / `aside`, `nav`, `header[data-app]`. Nếu cần ẩn hoàn
//    toàn cả layout server-side, chuyển trang sang route `/print/...` (chưa
//    cần ở phase này).
//  - Auth gate mirror pattern của /admin/products & /admin/orders (inline
//    `requireStaff` để khỏi phụ thuộc helper chưa tồn tại).
// ──────────────────────────────────────────────────────────────────────────────

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail } from "@/lib/ecommerce/order-queries";
import { siteConfig } from "@/lib/site-config";
import PrintOnMount from "./PrintOnMount";

// Force dynamic — invoice luôn fetch live (không ISR/SSG).
export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVnd(amount: number | null | undefined): string {
  const n = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString("vi-VN") + "đ";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function formatPaymentMethod(pm: string | null | undefined): string {
  switch (pm) {
    case "cod":
      return "Thanh toán khi nhận hàng (COD)";
    case "sepay":
      return "Chuyển khoản qua SePay";
    case "payos":
      return "Cổng thanh toán PayOS";
    case "bank_transfer":
      return "Chuyển khoản ngân hàng";
    default:
      return pm ?? "—";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1) Auth gate (staff only) — inline pattern khớp /admin/products.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const staffRoles = ["admin", "manager", "marketing", "sale", "support"];
  if (!profile || !staffRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  // 2) Fetch order detail.
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  // 3) Computed totals.
  // `order.amount` đã là tổng VND cuối cùng (đã gồm shipping_fee theo
  // convention checkout Week 6). Vì vậy subtotal = amount - shipping_fee.
  const shippingFee = Number(order.shipping_fee ?? 0);
  const total = Number(order.amount ?? 0);
  const subtotal = Math.max(total - shippingFee, 0);

  const recipientName =
    order.shipping_full_name?.trim() ||
    order.customer_name?.trim() ||
    "—";
  const recipientPhone =
    order.shipping_phone?.trim() || order.customer_phone?.trim() || "—";

  const addressLine =
    order.shipping_address_display ||
    [
      order.shipping_address_line,
      order.shipping_ward_code,
      order.shipping_province_code,
    ]
      .filter(Boolean)
      .join(", ") ||
    "—";

  return (
    <>
      {/* Client wrapper để auto-trigger window.print() khi mount. */}
      <PrintOnMount />

      {/* ── Print-specific CSS ── */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style>{`
        @page { size: A4 portrait; margin: 14mm 12mm; }

        /* Trang in luôn nền trắng, mực đen — kể cả khi app dùng dark theme. */
        .invoice-root {
          background: #ffffff;
          color: #000000;
          font-family: "Times New Roman", Georgia, serif;
          font-size: 12pt;
          line-height: 1.45;
          max-width: 210mm;
          margin: 0 auto;
          padding: 16mm 12mm;
          min-height: 100vh;
        }
        .invoice-root * { box-sizing: border-box; }

        .inv-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1.5px solid #000;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .inv-brand { display: flex; align-items: center; gap: 12px; }
        .inv-brand-mark {
          width: 56px; height: 56px;
          border: 1.5px solid #000;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 20pt;
          font-family: Arial, sans-serif;
          letter-spacing: -1px;
        }
        .inv-brand-name { font-weight: 700; font-size: 14pt; }
        .inv-brand-sub  { font-size: 10pt; color: #333; }

        .inv-title {
          text-align: center;
          font-size: 20pt;
          font-weight: 700;
          letter-spacing: 2px;
          margin: 14px 0 4px;
          text-transform: uppercase;
        }
        .inv-subtitle {
          text-align: center;
          font-size: 10pt;
          color: #444;
          margin-bottom: 16px;
        }

        .inv-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 24px;
          margin-bottom: 14px;
          font-size: 11pt;
        }
        .inv-meta b { font-weight: 700; }

        .inv-parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 14px;
        }
        .inv-card {
          border: 1px solid #000;
          padding: 10px 12px;
        }
        .inv-card h4 {
          margin: 0 0 6px;
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .inv-card p { margin: 2px 0; font-size: 11pt; }

        table.inv-items {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          font-size: 11pt;
        }
        table.inv-items th, table.inv-items td {
          border: 1px solid #000;
          padding: 6px 8px;
          vertical-align: top;
        }
        table.inv-items th {
          background: #f0f0f0;
          font-weight: 700;
          text-align: left;
        }
        table.inv-items td.num { text-align: right; white-space: nowrap; }
        table.inv-items td.center { text-align: center; }

        .inv-totals {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
        }
        .inv-totals table {
          border-collapse: collapse;
          min-width: 280px;
          font-size: 11pt;
        }
        .inv-totals td {
          padding: 4px 10px;
        }
        .inv-totals td.label { text-align: right; }
        .inv-totals td.value { text-align: right; white-space: nowrap; }
        .inv-totals tr.grand td {
          font-weight: 700;
          font-size: 13pt;
          border-top: 1.5px solid #000;
          padding-top: 8px;
        }

        .inv-payment {
          margin: 14px 0 6px;
          font-size: 11pt;
        }

        .inv-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 40px;
          font-size: 11pt;
          text-align: center;
        }
        .inv-sig-title { font-weight: 700; margin-bottom: 60px; }
        .inv-sig-name  { font-style: italic; color: #444; }

        .inv-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 10pt;
          color: #444;
          border-top: 1px dashed #000;
          padding-top: 10px;
        }

        /* ── Print mode ── */
        @media print {
          html, body { background: #ffffff !important; }
          body * { visibility: hidden !important; }
          .invoice-root, .invoice-root * { visibility: visible !important; }
          .invoice-root {
            position: absolute;
            inset: 0;
            margin: 0;
            padding: 0;
            max-width: none;
            min-height: auto;
            box-shadow: none;
          }
          [data-print-hide] { display: none !important; }
          a { color: #000 !important; text-decoration: none !important; }
        }
      `}</style>

      <div className="invoice-root">
        {/* ── Header ── */}
        <header className="inv-header">
          <div className="inv-brand">
            <div className="inv-brand-mark" aria-hidden>
              {siteConfig.shortName.charAt(0)}
            </div>
            <div>
              <div className="inv-brand-name">{siteConfig.name}</div>
              <div className="inv-brand-sub">{siteConfig.tagline}</div>
              <div className="inv-brand-sub">
                Website: {siteConfig.domain} · Email: {siteConfig.emailFrom}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "10pt" }}>
            <div>
              <b>Mã đơn:</b> {order.order_code}
            </div>
            <div>
              <b>Ngày:</b> {formatDate(order.created_at)}
            </div>
          </div>
        </header>

        {/* ── Title ── */}
        <h1 className="inv-title">Hoá đơn bán hàng</h1>
        <div className="inv-subtitle">
          (Bản in dùng cho mục đích nội bộ — không có giá trị thay thế hoá đơn thuế GTGT)
        </div>

        {/* ── Order meta ── */}
        <section className="inv-meta">
          <div>
            <b>Số hoá đơn:</b> {order.order_code}
          </div>
          <div>
            <b>Ngày phát hành:</b> {formatDate(order.created_at)}
          </div>
          <div>
            <b>Trạng thái đơn:</b> {order.status?.toUpperCase() ?? "—"}
          </div>
          <div>
            <b>Hình thức thanh toán:</b>{" "}
            {formatPaymentMethod(order.payment_method)}
          </div>
        </section>

        {/* ── Parties: Bên bán + Bên mua ── */}
        <section className="inv-parties">
          <div className="inv-card">
            <h4>Bên bán</h4>
            <p>
              <b>{siteConfig.name}</b>
            </p>
            <p>Website: {siteConfig.domain}</p>
            <p>Email: {siteConfig.emailFrom}</p>
            <p>Người đại diện: {siteConfig.owner.name}</p>
          </div>
          <div className="inv-card">
            <h4>Bên mua</h4>
            <p>
              <b>{recipientName}</b>
            </p>
            <p>SĐT: {recipientPhone}</p>
            {order.customer_email ? (
              <p>Email: {order.customer_email}</p>
            ) : null}
            <p>Địa chỉ: {addressLine}</p>
            {order.shipping_notes ? (
              <p>Ghi chú giao hàng: {order.shipping_notes}</p>
            ) : null}
          </div>
        </section>

        {/* ── Items table ── */}
        <table className="inv-items">
          <thead>
            <tr>
              <th style={{ width: "4%" }}>#</th>
              <th>Tên sản phẩm / dịch vụ</th>
              <th style={{ width: "18%" }}>Phân loại</th>
              <th style={{ width: "8%" }} className="center">
                SL
              </th>
              <th style={{ width: "16%" }} className="num">
                Đơn giá
              </th>
              <th style={{ width: "16%" }} className="num">
                Thành tiền
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="center" style={{ padding: "16px" }}>
                  Đơn hàng chưa có sản phẩm.
                </td>
              </tr>
            ) : (
              order.items.map((item, idx) => {
                const variantName =
                  item.product_snapshot?.variant_name?.trim() || "—";
                const lineSubtotal =
                  Number(item.unit_price ?? 0) * Number(item.quantity ?? 0);
                return (
                  <tr key={item.id}>
                    <td className="center">{idx + 1}</td>
                    <td>{item.name}</td>
                    <td>{variantName}</td>
                    <td className="center">{item.quantity}</td>
                    <td className="num">{formatVnd(item.unit_price)}</td>
                    <td className="num">{formatVnd(lineSubtotal)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ── Totals ── */}
        <div className="inv-totals">
          <table>
            <tbody>
              <tr>
                <td className="label">Tạm tính:</td>
                <td className="value">{formatVnd(subtotal)}</td>
              </tr>
              <tr>
                <td className="label">Phí vận chuyển:</td>
                <td className="value">{formatVnd(shippingFee)}</td>
              </tr>
              <tr className="grand">
                <td className="label">TỔNG CỘNG:</td>
                <td className="value">{formatVnd(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Payment method ── */}
        <p className="inv-payment">
          <b>Hình thức thanh toán:</b> {formatPaymentMethod(order.payment_method)}
        </p>

        {/* ── Signatures ── */}
        <section className="inv-signatures">
          <div>
            <div className="inv-sig-title">NGƯỜI MUA HÀNG</div>
            <div className="inv-sig-name">(Ký, ghi rõ họ tên)</div>
          </div>
          <div>
            <div className="inv-sig-title">ĐẠI DIỆN BÊN BÁN</div>
            <div className="inv-sig-name">(Ký, ghi rõ họ tên)</div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="inv-footer">
          <div>
            Cảm ơn quý khách đã mua hàng tại {siteConfig.name}. Mọi thắc mắc
            vui lòng liên hệ {siteConfig.emailFrom}.
          </div>
          <div style={{ marginTop: 4 }}>{siteConfig.footer.copyright}</div>
        </footer>
      </div>
    </>
  );
}
