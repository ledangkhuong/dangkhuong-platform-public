import { redirect } from "next/navigation";
import Link from "next/link";

import TopBar from "@/components/layout/TopBar";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils";
import ResyncButton from "./ResyncButton";

/**
 * Admin shipment detail (Week 5 — Shipping GHN).
 *
 * Server Component — load:
 *  - shipment row + parent order summary
 *  - shipment_events timeline (DESC theo occurred_at)
 *
 * Hiển thị:
 *  - Header (mã đơn nội bộ + mã carrier + nút "Đồng bộ GHN")
 *  - Khối "Thông tin vận đơn" (carrier, status, fee, weight, tracking link,
 *    expected/actual delivery date, last_synced_at)
 *  - Khối "Timeline sự kiện" (đếm từ shipment_events)
 *
 * Week 7 sẽ refactor: link đến trang chỉnh thông tin shipping, gắn vào tab
 * "Vận chuyển" trong trang chi tiết order, thêm action huỷ/tạo lại label.
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ShipmentRow {
  id: string;
  order_id: string;
  carrier: string;
  carrier_order_code: string | null;
  tracking_url: string | null;
  label_url: string | null;
  shipping_fee: number | null;
  weight_grams: number | null;
  service_type_code: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  status: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderSummary {
  id: string;
  order_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number | null;
  status: string | null;
  created_at: string | null;
}

interface ShipmentEvent {
  id: string;
  event_code: string;
  event_description: string | null;
  occurred_at: string;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatVnd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("vi-VN") + "đ";
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  created: { text: "Đã tạo", cls: "bg-gray-100 text-gray-800" },
  picked_up: { text: "Đã lấy hàng", cls: "bg-blue-100 text-blue-800" },
  in_transit: { text: "Đang giao", cls: "bg-amber-100 text-amber-800" },
  delivered: { text: "Đã giao", cls: "bg-green-100 text-green-800" },
  returned: { text: "Hoàn trả", cls: "bg-orange-100 text-orange-800" },
  cancelled: { text: "Đã huỷ", cls: "bg-red-100 text-red-800" },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_LABEL[status] ?? {
    text: status,
    cls: "bg-gray-100 text-gray-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}
    >
      {meta.text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminShipmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!id || !isValidUUID(id)) {
    redirect("/admin");
  }

  // Auth — admin / manager / sale có thể VIEW. Sale không có nút resync
  // (nút client-side sẽ nhận 403 nếu sale bấm; kiểm tra ngay tại đây để
  // không render nhầm.)
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

  const role = profile?.role ?? "";
  if (!["admin", "manager", "sale"].includes(role)) {
    redirect("/dashboard");
  }
  const canResync = ["admin", "manager"].includes(role);

  // Data — admin client để bypass RLS (đã authz ở trên).
  const supabase = await createAdminClient();

  const { data: shipmentRaw, error: shipErr } = await supabase
    .from("shipments")
    .select(
      "id, order_id, carrier, carrier_order_code, tracking_url, label_url, shipping_fee, weight_grams, service_type_code, expected_delivery_date, actual_delivery_date, status, last_synced_at, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (shipErr) {
    console.error("[admin/shipments/[id]] load error:", shipErr.message);
  }

  if (!shipmentRaw) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopBar title="Vận đơn" />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-800">
              Không tìm thấy vận đơn
            </h1>
            <p className="mt-1 text-sm text-red-700">
              Vận đơn với ID <code className="font-mono">{id}</code> không tồn
              tại hoặc đã bị xoá.
            </p>
            <Link
              href="/admin/orders"
              className="mt-3 inline-block text-sm font-medium text-red-700 underline"
            >
              ← Về danh sách đơn hàng
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const shipment = shipmentRaw as ShipmentRow;

  const { data: orderRaw } = await supabase
    .from("orders")
    .select(
      "id, order_code, customer_name, customer_phone, total_amount, status, created_at",
    )
    .eq("id", shipment.order_id)
    .maybeSingle();
  const order = (orderRaw as OrderSummary | null) ?? null;

  const { data: eventsRaw } = await supabase
    .from("shipment_events")
    .select("id, event_code, event_description, occurred_at")
    .eq("shipment_id", shipment.id)
    .order("occurred_at", { ascending: false })
    .limit(100);
  const events = (eventsRaw as ShipmentEvent[] | null) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Chi tiết vận đơn" subtitle="Theo dõi trạng thái + sync GHN" />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-gray-500">
          <Link href="/admin/orders" className="hover:text-gray-700">
            Đơn hàng
          </Link>
          <span className="mx-2">/</span>
          {order ? (
            <Link
              href={`/admin/orders?q=${encodeURIComponent(order.order_code ?? "")}`}
              className="hover:text-gray-700"
            >
              {order.order_code ?? order.id.slice(0, 8)}
            </Link>
          ) : (
            <span>Đơn không xác định</span>
          )}
          <span className="mx-2">/</span>
          <span className="text-gray-900">Vận đơn</span>
        </nav>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                Vận đơn {shipment.carrier.toUpperCase()}
              </h1>
              <StatusPill status={shipment.status} />
            </div>
            <p className="mt-1 font-mono text-sm text-gray-600">
              {shipment.carrier_order_code ?? "(chưa có mã carrier)"}
            </p>
          </div>
          {canResync && shipment.carrier === "ghn" && shipment.carrier_order_code ? (
            <ResyncButton shipmentId={shipment.id} />
          ) : (
            <span className="text-sm text-gray-500">
              {!canResync
                ? "Cần quyền admin/manager để đồng bộ"
                : "Chưa hỗ trợ đồng bộ"}
            </span>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Shipment info */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Thông tin vận đơn
            </h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Carrier">{shipment.carrier.toUpperCase()}</Field>
              <Field label="Loại dịch vụ">
                {shipment.service_type_code ?? "—"}
              </Field>
              <Field label="Mã carrier">
                <code className="font-mono text-sm">
                  {shipment.carrier_order_code ?? "—"}
                </code>
              </Field>
              <Field label="Phí vận chuyển">
                {formatVnd(shipment.shipping_fee)}
              </Field>
              <Field label="Khối lượng">
                {shipment.weight_grams != null
                  ? `${shipment.weight_grams.toLocaleString("vi-VN")} g`
                  : "—"}
              </Field>
              <Field label="Trạng thái">
                <StatusPill status={shipment.status} />
              </Field>
              <Field label="Dự kiến giao">
                {formatDateTime(shipment.expected_delivery_date)}
              </Field>
              <Field label="Giao thực tế">
                {formatDateTime(shipment.actual_delivery_date)}
              </Field>
              <Field label="Tạo lúc">
                {formatDateTime(shipment.created_at)}
              </Field>
              <Field label="Đồng bộ lần cuối">
                {formatDateTime(shipment.last_synced_at)}
              </Field>
              {shipment.tracking_url && (
                <Field label="Tracking">
                  <a
                    href={shipment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    Mở trang tracking
                  </a>
                </Field>
              )}
              {shipment.label_url && (
                <Field label="Label PDF">
                  <a
                    href={shipment.label_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    Tải label
                  </a>
                </Field>
              )}
            </dl>
          </section>

          {/* Order summary */}
          <section className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Đơn hàng liên kết
            </h2>
            {order ? (
              <dl className="space-y-3 text-sm">
                <Field label="Mã đơn">
                  <span className="font-mono">
                    {order.order_code ?? order.id.slice(0, 8)}
                  </span>
                </Field>
                <Field label="Khách hàng">{order.customer_name ?? "—"}</Field>
                <Field label="SĐT">{order.customer_phone ?? "—"}</Field>
                <Field label="Tổng tiền">
                  {formatVnd(order.total_amount)}
                </Field>
                <Field label="Trạng thái đơn">{order.status ?? "—"}</Field>
                <Field label="Ngày đặt">
                  {formatDateTime(order.created_at)}
                </Field>
              </dl>
            ) : (
              <p className="text-sm text-gray-500">
                Không tìm thấy đơn hàng liên kết.
              </p>
            )}
          </section>
        </div>

        {/* Timeline */}
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Timeline sự kiện
            </h2>
            <span className="text-xs text-gray-500">
              {events.length} sự kiện
            </span>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">
              Chưa có sự kiện nào. Bấm <strong>Đồng bộ GHN</strong> để kéo log
              từ carrier.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-gray-200 pl-4">
              {events.map((evt) => (
                <li key={evt.id} className="relative">
                  <span className="absolute -left-[21px] mt-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {evt.event_code}
                    </span>
                    <time className="text-xs text-gray-500">
                      {formatDateTime(evt.occurred_at)}
                    </time>
                  </div>
                  {evt.event_description && (
                    <p className="mt-0.5 text-sm text-gray-600">
                      {evt.event_description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline field component
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}
