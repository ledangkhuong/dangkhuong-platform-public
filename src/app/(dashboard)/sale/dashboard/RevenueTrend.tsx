"use client";

/**
 * RevenueTrend — last-N-days daily revenue area chart for the Sale Dashboard.
 *
 * Client component because recharts requires the DOM (ResponsiveContainer,
 * tooltips, hover). Data is fetched server-side via getDailyRevenue() and
 * passed in as a static prop — this component does NOT fetch.
 *
 * Today is highlighted with a ReferenceDot so the rep can immediately see
 * where the cumulative bar stands relative to the trailing fortnight.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; revenue: number; orders: number };

interface RevenueTrendProps {
  data: Point[];
}

function formatAbbreviatedVND(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
}

function formatDate(date: string): string {
  // expecting YYYY-MM-DD
  const parts = date.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return date;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Point; value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" }}
    >
      <p className="mb-1 text-xs font-medium text-white">
        Ngày {label ? formatDate(label) : ""}
      </p>
      <p className="text-xs" style={{ color: "#D4A843" }}>
        Doanh thu: {(p?.revenue ?? 0).toLocaleString("vi-VN")}đ
      </p>
      <p className="text-xs text-gray-400">
        Số đơn: {p?.orders ?? 0}
      </p>
    </div>
  );
}

export default function RevenueTrend({ data }: RevenueTrendProps) {
  const today = data[data.length - 1];

  const totalRevenue = data.reduce((s, p) => s + (p.revenue || 0), 0);
  const totalOrders = data.reduce((s, p) => s + (p.orders || 0), 0);

  return (
    <div className="card-dark p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            Xu hướng doanh thu {data.length} ngày gần nhất
          </h3>
          <p className="text-xs text-gray-400">
            Tổng {totalRevenue.toLocaleString("vi-VN")}đ • {totalOrders} đơn paid
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Hôm nay:{" "}
          <span className="font-semibold text-[#D4A843]">
            {(today?.revenue ?? 0).toLocaleString("vi-VN")}đ
          </span>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4A843" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#D4A843" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2a2a2a"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={{ stroke: "#2a2a2a" }}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              tickFormatter={formatAbbreviatedVND}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#D4A843"
              strokeWidth={2}
              fill="url(#revFill)"
            />
            {today ? (
              <ReferenceDot
                x={today.date}
                y={today.revenue}
                r={5}
                fill="#D4A843"
                stroke="#0a0a0a"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
