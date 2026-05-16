"use client";

import { DollarSign, ShoppingCart, Users, TrendingUp } from "lucide-react";

interface KPICardsProps {
  totalRevenue: number;
  prevRevenue: number;
  totalOrders: number;
  prevOrders: number;
  newUsers: number;
  prevUsers: number;
  avgOrderValue: number;
  prevAvgOrderValue: number;
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("vi-VN") + "đ";
}

function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

function calcPercentChange(current: number, prev: number): string {
  if (prev === 0) return "0.0";
  return ((current - prev) / prev * 100).toFixed(1);
}

interface CardConfig {
  label: string;
  value: string;
  percentChange: string;
  icon: React.ReactNode;
  color: string;
}

function KPICard({ label, value, percentChange, icon, color }: CardConfig) {
  const isPositive = parseFloat(percentChange) >= 0;

  return (
    <div className="card-dark p-5">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <span
          className={`text-xs font-medium flex items-center gap-1 ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {isPositive ? "↑" : "↓"} {Math.abs(parseFloat(percentChange))}%
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
      <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(Math.abs(parseFloat(percentChange)), 100)}%`,
            backgroundColor: isPositive ? "#22c55e" : "#ef4444",
          }}
        />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card-dark p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-white/10" />
        <div className="w-12 h-4 rounded bg-white/10" />
      </div>
      <div className="w-20 h-4 rounded bg-white/10 mb-2" />
      <div className="w-28 h-6 rounded bg-white/10" />
      <div className="mt-3 h-1 rounded-full bg-white/5" />
    </div>
  );
}

export default function KPICards({
  totalRevenue,
  prevRevenue,
  totalOrders,
  prevOrders,
  newUsers,
  prevUsers,
  avgOrderValue,
  prevAvgOrderValue,
  loading = false,
}: KPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const cards: CardConfig[] = [
    {
      label: "Doanh thu",
      value: formatCurrency(totalRevenue),
      percentChange: calcPercentChange(totalRevenue, prevRevenue),
      icon: <DollarSign size={20} />,
      color: "#D4A843",
    },
    {
      label: "Đơn hàng",
      value: formatNumber(totalOrders),
      percentChange: calcPercentChange(totalOrders, prevOrders),
      icon: <ShoppingCart size={20} />,
      color: "#f59e0b",
    },
    {
      label: "Học viên mới",
      value: formatNumber(newUsers),
      percentChange: calcPercentChange(newUsers, prevUsers),
      icon: <Users size={20} />,
      color: "#3b82f6",
    },
    {
      label: "Doanh thu TB/đơn",
      value: formatCurrency(avgOrderValue),
      percentChange: calcPercentChange(avgOrderValue, prevAvgOrderValue),
      icon: <TrendingUp size={20} />,
      color: "#a855f7",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <KPICard key={card.label} {...card} />
      ))}
    </div>
  );
}
