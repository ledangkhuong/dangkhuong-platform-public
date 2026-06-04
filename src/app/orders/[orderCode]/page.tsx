/**
 * Public order tracking page — `/orders/[orderCode]`.
 *
 * Server Component. Hiển thị trạng thái + chi tiết 1 đơn hàng theo
 * `order_code` (DKxxxxxxxx). Dùng `createAdminClient()` để bypass RLS
 * (order_code 8 ký tự đóng vai trò secret token tương tự "thank you" page
 * của Stripe/Saleor — ai có link đều xem được tóm tắt, không lộ user_id /
 * payment chi tiết).
 *
 * Quy tắc:
 *  - Không tìm thấy order → 404 (notFound()).
 *  - Display: order code, ngày đặt, status timeline, items snapshot,
 *    total, shipping address + carrier + tracking link (nếu physical/mixed).
 *  - Privacy: mask phone + email (chỉ hiển thị partial).
 *  - Auto-refresh: client component nested poll mỗi 30s qua
 *    `/api/orders/check-status` để cập nhật status mới nhất.
 *  - Backward compat: course-only orders KHÔNG có shipping_* / shipment →
 *    bỏ qua block shipping, chỉ render items + payment status.
 *
 * Force dynamic — không cache (tracking phải realtime).
 */

import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Truck,
  PackageCheck,
  Circle,
  ExternalLink,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Package,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/server";
import { OrderStatusRefresher } from "./OrderStatusRefresher";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Theo dõi đơn hàng — Lê Đăng Khương Academy",
  description: "Theo dõi trạng thái đơn hàng của bạn.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OrderType = "course" | "physical" | "mixed";

interface OrderRow {
  id: string;
  order_code: string;
  status: string;
  amount: number | null;
  payment_method: string | null;
  order_type: OrderType | null;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_full_name: string | null;
  shipping_phone: string | null;
  shipping_address_line: string | null;
  shipping_ward_code: string | null;
  shipping_province_code: string | null;
  shipping_notes: string | null;
  shipping_fee: number | null;
  shipping_carrier: string | null;
  shipping_status: string | null;
}

interface OrderItemRow {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  item_type: string;
  product_snapshot: Record<string, unknown> | null;
}

interface ShipmentRow {
  id: string;
  carrier: string;
  carrier_order_code: string | null;
  tracking_url: string | null;
  status: string;
  shipping_fee: number | null;
  pickup_at: string | null;
  delivered_at: string | null;
  updated_at: string;
}

interface AddressLabel {
  wardName: string | null;
  provinceName: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return VND.format(Number(value));
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/** Mask phone: 0987654321 → 098****321 */
function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

/** Mask email: user@example.com → us***@example.com */
function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case "sepay":
    case "bank_transfer":
      return "Chuyển khoản ngân hàng";
    case "payos":
      return "PayOS";
    case "cod":
      return "Thanh toán khi nhận hàng (COD)";
    default:
      return method ?? "—";
  }
}

function carrierLabel(carrier: string | null): string {
  if (!carrier) return "—";
  return carrier.toUpperCase();
}

// ---------------------------------------------------------------------------
// Status timeline logic
// ---------------------------------------------------------------------------

type TimelineState = "done" | "active" | "pending";

interface TimelineStep {
  key: string;
  label: string;
  icon: typeof CheckCircle2;
  state: TimelineState;
}

/**
 * Compute timeline steps. Logic:
 *  - "Đặt hàng": luôn done.
 *  - "Thanh toán": done nếu order.status ∈ {paid, processing, shipped, delivered, completed},
 *    active nếu status='pending', pending otherwise.
 *  - "Đang giao": chỉ áp dụng physical/mixed. done nếu shipment.status='delivered',
 *    active nếu shipment.status ∈ {picked_up, in_transit, ...}, pending nếu chưa có shipment.
 *  - "Đã giao": done nếu shipment delivered hoặc order completed (course-only).
 *
 * Course-only order → skip "Đang giao", chỉ 3 bước.
 */
function buildTimeline(
  order: OrderRow,
  shipment: ShipmentRow | null,
): TimelineStep[] {
  const orderType: OrderType = order.order_type ?? "course";
  const isPhysical = orderType === "physical" || orderType === "mixed";

  const paidStatuses = new Set([
    "paid",
    "processing",
    "shipped",
    "delivered",
    "completed",
  ]);
  const isPaid = paidStatuses.has(order.status);

  const shippedStatuses = new Set([
    "picked_up",
    "in_transit",
    "out_for_delivery",
  ]);
  const isShipping = shipment ? shippedStatuses.has(shipment.status) : false;
  const isDelivered = shipment
    ? shipment.status === "delivered"
    : order.status === "completed" || order.status === "delivered";

  const steps: TimelineStep[] = [
    {
      key: "placed",
      label: "Đặt hàng",
      icon: ShoppingBag,
      state: "done",
    },
    {
      key: "paid",
      label: "Thanh toán",
      icon: CreditCard,
      state: isPaid ? "done" : "active",
    },
  ];

  if (isPhysical) {
    steps.push({
      key: "shipping",
      label: "Đang giao",
      icon: Truck,
      state: isDelivered
        ? "done"
        : isShipping
          ? "active"
          : isPaid
            ? "active"
            : "pending",
    });
  }

  steps.push({
    key: "delivered",
    label: isPhysical ? "Đã giao" : "Hoàn tất",
    icon: PackageCheck,
    state: isDelivered ? "done" : "pending",
  });

  return steps;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchOrderByCode(orderCode: string): Promise<{
  order: OrderRow;
  items: OrderItemRow[];
  shipment: ShipmentRow | null;
  addressLabel: AddressLabel;
} | null> {
  try {
    const supabase = await createAdminClient();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(
        [
          "id",
          "order_code",
          "status",
          "amount",
          "payment_method",
          "order_type",
          "created_at",
          "customer_name",
          "customer_email",
          "customer_phone",
          "shipping_full_name",
          "shipping_phone",
          "shipping_address_line",
          "shipping_ward_code",
          "shipping_province_code",
          "shipping_notes",
          "shipping_fee",
          "shipping_carrier",
          "shipping_status",
        ].join(", "),
      )
      .eq("order_code", orderCode)
      .maybeSingle<OrderRow>();

    if (orderErr) {
      console.error("[/orders/[orderCode]] fetch order error", orderErr);
      return null;
    }
    if (!order) return null;

    const [{ data: items }, { data: shipments }, addressLabel] =
      await Promise.all([
        supabase
          .from("order_items")
          .select(
            "id, name, unit_price, quantity, item_type, product_snapshot",
          )
          .eq("order_id", order.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("shipments")
          .select(
            "id, carrier, carrier_order_code, tracking_url, status, shipping_fee, pickup_at, delivered_at, updated_at",
          )
          .eq("order_id", order.id)
          .order("created_at", { ascending: false })
          .limit(1),
        resolveAddressLabel(
          supabase,
          order.shipping_ward_code,
          order.shipping_province_code,
        ),
      ]);

    return {
      order,
      items: (items as OrderItemRow[] | null) ?? [],
      shipment:
        (shipments as ShipmentRow[] | null)?.[0] ?? null,
      addressLabel,
    };
  } catch (err) {
    console.error("[/orders/[orderCode]] fetch exception", err);
    return null;
  }
}

async function resolveAddressLabel(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  wardCode: string | null,
  provinceCode: string | null,
): Promise<AddressLabel> {
  if (!wardCode && !provinceCode) {
    return { wardName: null, provinceName: null };
  }
  try {
    const [wardRes, provRes] = await Promise.all([
      wardCode
        ? supabase
            .from("vn_wards")
            .select("name")
            .eq("code", wardCode)
            .maybeSingle<{ name: string }>()
        : Promise.resolve({ data: null }),
      provinceCode
        ? supabase
            .from("vn_provinces")
            .select("name")
            .eq("code", provinceCode)
            .maybeSingle<{ name: string }>()
        : Promise.resolve({ data: null }),
    ]);

    return {
      wardName: wardRes?.data?.name ?? null,
      provinceName: provRes?.data?.name ?? null,
    };
  } catch (err) {
    console.error("[/orders/[orderCode]] resolveAddressLabel error", err);
    return { wardName: null, provinceName: null };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface OrderTrackingPageProps {
  params: Promise<{ orderCode: string }>;
}

export default async function OrderTrackingPage({
  params,
}: OrderTrackingPageProps) {
  const { orderCode: rawCode } = await params;
  const orderCode = (rawCode ?? "").trim();

  if (!orderCode) {
    notFound();
  }

  const result = await fetchOrderByCode(orderCode);
  if (!result) {
    notFound();
  }

  const { order, items, shipment, addressLabel } = result;
  const orderType: OrderType = order.order_type ?? "course";
  const isPhysical = orderType === "physical" || orderType === "mixed";
  const timeline = buildTimeline(order, shipment);

  const subtotal = items.reduce(
    (acc, it) => acc + Number(it.unit_price ?? 0) * Number(it.quantity ?? 0),
    0,
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      {/* Client-side auto-refresh poller */}
      <OrderStatusRefresher orderCode={order.order_code} intervalMs={30000} />

      <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Đơn hàng
            </p>
            <h1 className="mt-1 font-mono text-2xl font-bold text-[#D4A843] sm:text-3xl">
              {order.order_code}
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Đặt lúc {formatDate(order.created_at)}
            </p>
          </div>
          <Link
            href="/orders/track"
            className="inline-flex items-center gap-2 self-start rounded-md border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-[#D4A843]/40 hover:text-[#D4A843] sm:self-auto"
          >
            Tra cứu đơn khác
          </Link>
        </div>

        {/* Status timeline */}
        <section className="mt-10">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-neutral-300">
            Trạng thái đơn hàng
          </h2>
          <ol className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-0">
            {timeline.map((step, idx) => {
              const isLast = idx === timeline.length - 1;
              const Icon = step.icon;
              const isDone = step.state === "done";
              const isActive = step.state === "active";

              const iconColor = isDone
                ? "#22c55e"
                : isActive
                  ? "#D4A843"
                  : "#525252";
              const ringBg = isDone
                ? "rgba(34, 197, 94, 0.12)"
                : isActive
                  ? "rgba(212, 168, 67, 0.12)"
                  : "rgba(82, 82, 82, 0.12)";

              return (
                <li
                  key={step.key}
                  className="relative flex flex-1 items-start gap-4 sm:flex-col sm:items-center sm:text-center"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: iconColor,
                      backgroundColor: ringBg,
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2
                        className="h-5 w-5"
                        style={{ color: iconColor }}
                      />
                    ) : (
                      <Icon
                        className="h-5 w-5"
                        style={{ color: iconColor }}
                      />
                    )}
                  </div>
                  <div className="flex-1 sm:mt-2">
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: isDone || isActive ? "#fafafa" : "#737373",
                      }}
                    >
                      {step.label}
                    </p>
                    {isActive && (
                      <p className="mt-0.5 text-xs text-[#D4A843]">
                        Đang xử lý
                      </p>
                    )}
                  </div>
                  {/* Connector line — chỉ desktop */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-5 top-10 hidden h-px sm:left-[calc(50%+1.25rem)] sm:top-5 sm:block sm:w-[calc(100%-2.5rem)]"
                      style={{
                        backgroundColor: isDone
                          ? "rgba(34, 197, 94, 0.4)"
                          : "rgba(82, 82, 82, 0.4)",
                      }}
                    />
                  )}
                  {/* Vertical connector — mobile only */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-5 top-10 block h-5 w-px sm:hidden"
                      style={{
                        backgroundColor: isDone
                          ? "rgba(34, 197, 94, 0.4)"
                          : "rgba(82, 82, 82, 0.4)",
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Main grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* Items list */}
          <section className="rounded-xl border border-white/10 bg-[#111] p-5 lg:col-span-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
              <Package className="size-4 text-[#D4A843]" />
              Sản phẩm ({items.length})
            </h2>
            <ul className="mt-4 divide-y divide-white/5">
              {items.map((item) => {
                const snapshot = item.product_snapshot ?? {};
                const thumb =
                  (snapshot as Record<string, unknown>).thumbnail_url as
                    | string
                    | null
                    | undefined;
                const variantName = (snapshot as Record<string, unknown>)
                  .variant_name as string | null | undefined;

                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-[#0a0a0a]">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-neutral-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-100">
                        {item.name}
                      </p>
                      {variantName && (
                        <p className="mt-0.5 truncate text-xs text-neutral-500">
                          {variantName}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-neutral-500">
                        SL: {item.quantity} × {formatVnd(item.unit_price)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-neutral-100">
                      {formatVnd(
                        Number(item.unit_price ?? 0) *
                          Number(item.quantity ?? 0),
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>

            {/* Totals */}
            <div className="mt-5 space-y-2 border-t border-white/5 pt-4">
              <div className="flex justify-between text-sm text-neutral-400">
                <span>Tạm tính</span>
                <span>{formatVnd(subtotal)}</span>
              </div>
              {isPhysical && (
                <div className="flex justify-between text-sm text-neutral-400">
                  <span>Phí vận chuyển</span>
                  <span>{formatVnd(order.shipping_fee ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-white/5 pt-3 text-base font-semibold text-neutral-100">
                <span>Tổng cộng</span>
                <span className="text-[#D4A843]">
                  {formatVnd(order.amount)}
                </span>
              </div>
            </div>

            {/* Payment method */}
            <div className="mt-5 rounded-md border border-white/5 bg-[#0a0a0a] p-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Phương thức thanh toán
              </p>
              <p className="mt-1 text-sm text-neutral-200">
                {paymentMethodLabel(order.payment_method)}
              </p>
            </div>
          </section>

          {/* Right column — customer + shipping */}
          <aside className="space-y-6">
            {/* Customer (masked) */}
            <section className="rounded-xl border border-white/10 bg-[#111] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-200">
                Người đặt
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-neutral-500">Họ tên</dt>
                  <dd className="text-neutral-200">
                    {order.customer_name ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-3.5 shrink-0 text-neutral-500" />
                  <dd className="text-neutral-300">
                    {maskPhone(order.customer_phone)}
                  </dd>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-3.5 shrink-0 text-neutral-500" />
                  <dd className="break-all text-neutral-300">
                    {maskEmail(order.customer_email)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Shipping (physical/mixed only) */}
            {isPhysical && (
              <section className="rounded-xl border border-white/10 bg-[#111] p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
                  <Truck className="size-4 text-[#D4A843]" />
                  Vận chuyển
                </h2>

                {/* Recipient address */}
                <div className="mt-3 space-y-2 text-sm">
                  <p className="font-medium text-neutral-200">
                    {order.shipping_full_name ?? order.customer_name ?? "—"}
                  </p>
                  <p className="text-neutral-400">
                    {maskPhone(order.shipping_phone ?? order.customer_phone)}
                  </p>
                  <div className="flex items-start gap-2 text-neutral-300">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-neutral-500" />
                    <p className="leading-relaxed">
                      {[
                        order.shipping_address_line,
                        addressLabel.wardName,
                        addressLabel.provinceName,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                  {order.shipping_notes && (
                    <p className="text-xs italic text-neutral-500">
                      Ghi chú: {order.shipping_notes}
                    </p>
                  )}
                </div>

                {/* Carrier + tracking */}
                <div className="mt-4 space-y-3 border-t border-white/5 pt-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Đơn vị vận chuyển
                    </p>
                    <p className="mt-1 text-neutral-200">
                      {carrierLabel(
                        shipment?.carrier ?? order.shipping_carrier,
                      )}
                    </p>
                  </div>

                  {shipment?.carrier_order_code && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Mã vận đơn
                      </p>
                      <p className="mt-1 font-mono text-neutral-200">
                        {shipment.carrier_order_code}
                      </p>
                    </div>
                  )}

                  {shipment?.tracking_url ? (
                    <a
                      href={shipment.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:underline"
                    >
                      Theo dõi trên hệ thống vận chuyển
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      {shipment
                        ? "Chưa có link theo dõi."
                        : "Đơn hàng đang được xử lý — chưa tạo vận đơn."}
                    </p>
                  )}

                  {shipment?.delivered_at && (
                    <p className="text-xs text-neutral-500">
                      Giao thành công lúc {formatDate(shipment.delivered_at)}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Help */}
            <section className="rounded-xl border border-white/10 bg-[#111] p-5 text-xs leading-relaxed text-neutral-400">
              <p>
                Cần hỗ trợ? Vui lòng liên hệ qua Zalo/Facebook trong trang
                liên hệ với mã đơn{" "}
                <span className="font-mono text-[#D4A843]">
                  {order.order_code}
                </span>
                .
              </p>
            </section>
          </aside>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-6 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-[#D4A843]/40 hover:text-[#D4A843]"
          >
            <ShoppingBag className="h-4 w-4" />
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </main>
  );
}
