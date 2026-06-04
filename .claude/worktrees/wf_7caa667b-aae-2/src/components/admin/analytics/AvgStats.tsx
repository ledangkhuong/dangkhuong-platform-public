"use client";

import { DollarSign, ShoppingCart, UserPlus } from "lucide-react";

interface AvgStatsProps {
  totalRevenue: number;
  totalOrders: number;
  newUsers: number;
  daysInRange: number;
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString("vi-VN") + "đ";
}

function formatDecimal(value: number): string {
  return value.toFixed(1);
}

interface CardConfig {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}

function AvgCard({ label, value, subtitle, icon, color }: CardConfig) {
  return (
    <div className="card-dark p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}26` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card-dark p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/10" />
        <div className="flex-1">
          <div className="w-20 h-3 rounded bg-white/10 mb-2" />
          <div className="w-16 h-5 rounded bg-white/10 mb-1" />
          <div className="w-14 h-3 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export default function AvgStats({
  totalRevenue,
  totalOrders,
  newUsers,
  daysInRange,
  loading = false,
}: AvgStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const days = daysInRange > 0 ? daysInRange : 1;

  const cards: CardConfig[] = [
    {
      label: "Doanh thu TB/ngày",
      value: formatCurrency(totalRevenue / days),
      subtitle: `Trong ${days} ngày`,
      icon: <DollarSign size={18} />,
      color: "#D4A843",
    },
    {
      label: "Đơn hàng TB/ngày",
      value: formatDecimal(totalOrders / days),
      subtitle: `Trong ${days} ngày`,
      icon: <ShoppingCart size={18} />,
      color: "#f59e0b",
    },
    {
      label: "Học viên mới TB/ngày",
      value: formatDecimal(newUsers / days),
      subtitle: `Trong ${days} ngày`,
      icon: <UserPlus size={18} />,
      color: "#3b82f6",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <AvgCard key={card.label} {...card} />
      ))}
    </div>
  );
}
