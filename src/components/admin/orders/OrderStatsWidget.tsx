/**
 * OrderStatsWidget — Week 7 wire
 *
 * Server Component hiển thị số liệu nhanh cho đơn hàng vật lý ở admin
 * dashboard (`/admin`). Fetch số liệu qua `getOrderStats()`
 * (Service Role, scope `order_type IN ('physical','mixed')`).
 *
 * 4 stat cards:
 *  - Chờ thanh toán (pending payment)
 *  - Chờ ship (paid + shipping_status pending/ready_to_ship)
 *  - Đang giao (in transit / out for delivery / picked up)
 *  - Đã giao hôm nay (delivered today)
 *
 * Mỗi card link sang `/admin/orders/physical` với filter tương ứng để
 * staff click vào xem chi tiết ngay. Card sử dụng class `card-dark` để
 * đồng bộ với các stat card khác trên dashboard.
 *
 * Lưu ý: đây là Server Component — KHÔNG đánh dấu "use client" vì
 * `getOrderStats` dùng admin client (service role) trên server.
 */

import Link from "next/link";
import { getOrderStats } from "@/lib/ecommerce/order-queries";
import {
  Clock,
  PackageOpen,
  Truck,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface StatCard {
  label: string;
  value: number;
  href: string;
  icon: typeof Clock;
  color: string;
  bg: string;
}

export default async function OrderStatsWidget() {
  // Stat fetch có thể throw nếu DB lỗi — để dashboard không sập, swallow
  // và render UI placeholder. Log để debug ở server.
  let stats: Awaited<ReturnType<typeof getOrderStats>>;
  try {
    stats = await getOrderStats();
  } catch (err) {
    console.error("[OrderStatsWidget] getOrderStats failed", err);
    stats = {
      pendingPayment: 0,
      paidAwaitingShip: 0,
      inTransit: 0,
      deliveredToday: 0,
    };
  }

  const cards: StatCard[] = [
    {
      label: "Chờ thanh toán",
      value: stats.pendingPayment,
      href: "/admin/orders/physical?status=pending",
      icon: Clock,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
    },
    {
      label: "Chờ ship",
      value: stats.paidAwaitingShip,
      href: "/admin/orders/physical?status=paid",
      icon: PackageOpen,
      color: "#D4A843",
      bg: "rgba(212,168,67,0.12)",
    },
    {
      label: "Đang vận chuyển",
      value: stats.inTransit,
      href: "/admin/orders/physical?status=shipped",
      icon: Truck,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.12)",
    },
    {
      label: "Đã giao hôm nay",
      value: stats.deliveredToday,
      href: "/admin/orders/physical?status=delivered",
      icon: CheckCircle,
      color: "#22c55e",
      bg: "rgba(34,197,94,0.12)",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-white text-sm">Đơn hàng vật lý</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Tình trạng giao nhận theo thời gian thực
          </p>
        </div>
        <Link
          href="/admin/orders/physical"
          className="inline-flex items-center gap-1 text-xs text-[#D4A843] hover:text-[#e7c46a] transition-colors"
        >
          Xem tất cả
          <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card-dark p-4 hover:bg-[#1f1f1f] transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: c.bg }}
              >
                <c.icon size={15} style={{ color: c.color }} />
              </div>
              <ArrowRight
                size={12}
                className="text-gray-600 group-hover:text-gray-300 transition-colors"
              />
            </div>
            <div className="text-xl font-bold text-white">
              {c.value.toLocaleString("vi-VN")}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
