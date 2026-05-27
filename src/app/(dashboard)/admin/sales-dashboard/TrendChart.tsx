"use client";

/**
 * TrendChart — last-N-days team revenue area chart for the Admin
 * sales-dashboard. Client component because recharts needs the DOM.
 *
 * Data is fetched server-side via getDailyRevenue({ saleId: null }) and
 * passed in as a static prop — this component does NOT fetch.
 *
 * Three series:
 *   - Platform revenue (gold area, primary axis) — real cash via web.
 *   - External revenue (light-gray dashed line, same axis) — paid via
 *     Facebook / Zalo / bank / cash before being granted access here.
 *   - Order count (blue dashed line, secondary axis) — unchanged.
 *
 * Matches the dark + brand-gold theme used across the dashboard.
 */
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  date: string;
  revenue: number;
  revenue_platform?: number;
  revenue_external?: number;
  orders: number;
};

interface TrendChartProps {
  data: Point[];
}

function formatAbbreviatedVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

function formatDate(date: string): string {
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
  const platform = p?.revenue_platform ?? p?.revenue ?? 0;
  const external = p?.revenue_external ?? 0;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" }}
    >
      <p className="mb-1 text-xs font-medium text-white">
        Ngày {label ? formatDate(label) : ""}
      </p>
      <p className="text-xs" style={{ color: "#D4A843" }}>
        Doanh thu nền tảng: {platform.toLocaleString("vi-VN")}đ
      </p>
      {external > 0 ? (
        <p className="text-xs text-gray-400">
          Thanh toán ngoài: {external.toLocaleString("vi-VN")}đ
        </p>
      ) : null}
      <p className="text-xs text-gray-400">Số đơn: {p?.orders ?? 0}</p>
    </div>
  );
}

export default function TrendChart({ data }: TrendChartProps) {
  // Backwards-compat for cached payloads that lack the split fields.
  const normalized = data.map((p) => ({
    ...p,
    revenue_platform: p.revenue_platform ?? p.revenue ?? 0,
    revenue_external: p.revenue_external ?? 0,
  }));

  const totalPlatform = normalized.reduce(
    (s, p) => s + (p.revenue_platform || 0),
    0
  );
  const totalExternal = normalized.reduce(
    (s, p) => s + (p.revenue_external || 0),
    0
  );
  const totalOrders = normalized.reduce((s, p) => s + (p.orders || 0), 0);
  const avg =
    normalized.length > 0 ? Math.round(totalPlatform / normalized.length) : 0;
  const hasExternal = totalExternal > 0;

  return (
    <div className="card-dark p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            Doanh thu toàn đội — {data.length} ngày gần nhất
          </h3>
          <p className="text-xs text-gray-400">
            Nền tảng: {totalPlatform.toLocaleString("vi-VN")}đ
            {hasExternal ? (
              <>
                {" • "}Thanh toán ngoài:{" "}
                {totalExternal.toLocaleString("vi-VN")}đ
              </>
            ) : null}
            {" • "}
            {totalOrders} đơn paid
            {normalized.length > 0 ? (
              <>
                {" • "}TB {avg.toLocaleString("vi-VN")}đ/ngày
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={normalized}
            margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="adminTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D4A843" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#D4A843" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={{ stroke: "#2a2a2a" }}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              yAxisId="rev"
              tickFormatter={formatAbbreviatedVND}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <YAxis
              yAxisId="ord"
              orientation="right"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {hasExternal ? (
              <Legend
                verticalAlign="top"
                height={24}
                wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
              />
            ) : null}
            <Area
              yAxisId="rev"
              type="monotone"
              dataKey="revenue_platform"
              name="Doanh thu nền tảng"
              stroke="#D4A843"
              strokeWidth={2}
              fill="url(#adminTrendFill)"
            />
            {hasExternal ? (
              <Line
                yAxisId="rev"
                type="monotone"
                dataKey="revenue_external"
                name="Thanh toán ngoài"
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
              />
            ) : null}
            <Line
              yAxisId="ord"
              type="monotone"
              dataKey="orders"
              name="Số đơn"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
