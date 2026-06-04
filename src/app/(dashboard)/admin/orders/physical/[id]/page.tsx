import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail } from "@/lib/ecommerce/order-queries";
import OrderActions from "@/components/admin/orders/OrderActions";
import OrderNoteForm from "@/components/admin/OrderNoteForm";
import OrderStatusTimeline from "@/components/admin/orders/OrderStatusTimeline";
import {
  ChevronLeft,
  ExternalLink,
  Printer,
  Package,
  Truck,
  MapPin,
  User,
  StickyNote,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const staff = ["admin", "manager", "marketing"];
  if (!profile || !staff.includes(profile.role)) redirect("/dashboard");
}

function formatVND(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString("vi-VN") + "₫";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  } catch {
    return value;
  }
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ thanh toán", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  paid: { label: "Đã thanh toán", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Đã huỷ", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  refunded: { label: "Đã hoàn", color: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

export default async function PhysicalOrderDetailPage({ params }: PageProps) {
  await requireStaff();
  const { id } = await params;

  const order = await getOrderDetail(id);
  if (!order) notFound();

  const items = order.items ?? [];
  const shipment = order.shipments?.[0] ?? null;
  const subtotal = items.reduce(
    (sum: number, it) => sum + (it.unit_price ?? 0) * (it.quantity ?? 0),
    0,
  );
  const statusInfo = STATUS_BADGES[order.status] ?? { label: order.status, color: "bg-gray-500/15 text-gray-400 border-gray-500/30" };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      <TopBar title={`Đơn ${order.order_code}`} subtitle="Chi tiết & xử lý đơn hàng vật lý" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Back nav + actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/orders/physical"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-[#D4A843]"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/orders/physical/${order.id}/invoice`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
            >
              <Printer className="w-3 h-3" /> In hoá đơn
            </Link>
            <Link
              href={`/orders/${order.order_code}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
            >
              <ExternalLink className="w-3 h-3" /> Xem trang công khai
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-4 rounded-xl border border-white/10 bg-[#0e0e0e] p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-lg font-bold text-white">{order.order_code}</h1>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
              <span className="text-xs text-gray-500">Đặt ngày {formatDateTime(order.created_at)}</span>
            </div>

            <Accordion>
              {/* Customer info */}
              <AccordionItem value="customer">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#D4A843]" />
                    Thông tin khách hàng
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-gray-500">Họ tên</dt>
                      <dd className="text-gray-200">{order.customer_name || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">SĐT</dt>
                      <dd className="text-gray-200 font-mono">{order.customer_phone || "—"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-gray-500">Email</dt>
                      <dd className="text-gray-200">{order.customer_email || "—"}</dd>
                    </div>
                  </dl>
                </AccordionContent>
              </AccordionItem>

              {/* Shipping address */}
              <AccordionItem value="shipping">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#D4A843]" />
                    Địa chỉ giao hàng
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-xs text-gray-500">Người nhận:</span>{" "}
                      <span className="text-gray-200">{order.shipping_full_name || order.customer_name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">SĐT giao:</span>{" "}
                      <span className="text-gray-200 font-mono">{order.shipping_phone || order.customer_phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Địa chỉ:</span>{" "}
                      <span className="text-gray-200">{order.shipping_address_display || order.shipping_address_line || "—"}</span>
                    </div>
                    {order.shipping_notes && (
                      <div className="rounded bg-white/5 p-2">
                        <span className="text-xs text-gray-500">Ghi chú giao:</span>{" "}
                        <span className="text-gray-300">{order.shipping_notes}</span>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Items */}
              <AccordionItem value="items">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#D4A843]" />
                    Sản phẩm ({items.length})
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 border-b border-white/10">
                        <tr>
                          <th className="text-left py-2">Tên</th>
                          <th className="text-right py-2">Đơn giá</th>
                          <th className="text-right py-2">SL</th>
                          <th className="text-right py-2">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2">
                              <div className="text-gray-200">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.item_type}</div>
                            </td>
                            <td className="py-2 text-right text-gray-300">{formatVND(item.unit_price)}</td>
                            <td className="py-2 text-right text-gray-300">{item.quantity}</td>
                            <td className="py-2 text-right text-[#D4A843] font-medium">
                              {formatVND((item.unit_price ?? 0) * (item.quantity ?? 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10">
                          <td colSpan={3} className="py-2 text-right text-xs text-gray-500">
                            Subtotal
                          </td>
                          <td className="py-2 text-right text-gray-300">{formatVND(subtotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="py-2 text-right text-xs text-gray-500">
                            Phí vận chuyển
                          </td>
                          <td className="py-2 text-right text-gray-300">{formatVND(order.shipping_fee)}</td>
                        </tr>
                        <tr className="border-t border-white/10">
                          <td colSpan={3} className="py-2 text-right text-sm font-bold text-white">
                            Tổng cộng
                          </td>
                          <td className="py-2 text-right text-[#D4A843] font-bold text-base">
                            {formatVND(order.amount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Shipment */}
              <AccordionItem value="shipment">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#D4A843]" />
                    Vận chuyển
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {!shipment ? (
                    <p className="text-sm text-gray-500">
                      Chưa có vận đơn. Bấm &quot;Tạo vận đơn GHN&quot; bên phải để khởi tạo.
                    </p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Carrier</dt>
                          <dd className="text-gray-200 uppercase">{shipment.carrier}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Mã vận đơn</dt>
                          <dd className="text-gray-200 font-mono">{shipment.carrier_order_code}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Trạng thái</dt>
                          <dd className="text-gray-200">{shipment.status}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Tracking</dt>
                          <dd>
                            {shipment.tracking_url ? (
                              <a
                                href={shipment.tracking_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#D4A843] hover:underline inline-flex items-center gap-1"
                              >
                                Theo dõi <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </dd>
                        </div>
                      </div>

                      {shipment.events && shipment.events.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-400 mb-2">Lịch sử trạng thái</h4>
                          <ul className="space-y-2">
                            {shipment.events.map((ev) => (
                              <li key={ev.id} className="flex items-start gap-2 text-xs">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D4A843]" />
                                <div>
                                  <div className="text-gray-300">{ev.description || ev.status}</div>
                                  <div className="text-gray-500">{formatDateTime(ev.occurred_at)}</div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Notes */}
              <AccordionItem value="notes" defaultOpen={false}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-[#D4A843]" />
                    Ghi chú nội bộ
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    {order.note && (
                      <pre className="whitespace-pre-wrap rounded-md bg-white/5 p-3 text-xs text-gray-300 font-mono">
                        {order.note}
                      </pre>
                    )}
                    <OrderNoteForm orderId={order.id} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Right: actions + timeline */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <OrderActions order={order as any} shipment={shipment} />
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Lịch trình
              </h3>
              <OrderStatusTimeline order={order} shipment={shipment} />
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0e0e0e] p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Tổng tiền</span>
                <span className="text-[#D4A843] font-bold">{formatVND(order.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phí ship</span>
                <span className="text-gray-300">{formatVND(order.shipping_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Thanh toán</span>
                <span className="text-gray-300 uppercase">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Loại</span>
                <span className="text-gray-300">{order.order_type ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
