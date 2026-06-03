'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
    revenue_platform?: number;
    revenue_external?: number;
    orders: number;
  }>;
  groupBy: 'day' | 'month';
  loading?: boolean;
}

const SERIES_LABELS: Record<string, string> = {
  revenue: 'Doanh thu',
  revenue_platform: 'Doanh thu nền tảng',
  revenue_external: 'Doanh thu cấp ngoài',
  orders: 'Đơn hàng',
};

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

function formatDate(date: string, groupBy: 'day' | 'month'): string {
  if (groupBy === 'month') {
    // Expect date in format YYYY-MM or similar
    const parts = date.split('-');
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0]}`;
    }
    return date;
  }
  // Daily: expect YYYY-MM-DD
  const parts = date.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return date;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const revenueTotal = payload
    .filter((e) => e.name.startsWith('revenue'))
    .reduce((s, e) => s + (e.value || 0), 0);

  return (
    <div
      className="rounded-lg border px-4 py-3 shadow-lg"
      style={{
        backgroundColor: '#1a1a1a',
        borderColor: '#2a2a2a',
      }}
    >
      <p className="mb-2 text-sm font-medium text-white">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {SERIES_LABELS[entry.name] ?? entry.name}:{' '}
          {entry.name === 'orders'
            ? entry.value
            : entry.value.toLocaleString('vi-VN') + 'đ'}
        </p>
      ))}
      <p className="mt-1.5 border-t border-[#2a2a2a] pt-1.5 text-sm font-semibold text-white">
        Tổng doanh thu: {revenueTotal.toLocaleString('vi-VN')}đ
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="card-dark p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-48 animate-pulse rounded bg-gray-700" />
        <div className="h-5 w-32 animate-pulse rounded bg-gray-700" />
      </div>
      <div className="h-[300px] w-full animate-pulse rounded bg-gray-800" />
    </div>
  );
}

export default function RevenueChart({ data, groupBy, loading }: RevenueChartProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  const periodLabel = groupBy === 'day' ? 'Theo ngày' : 'Theo tháng';

  return (
    <div className="card-dark p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Xu hướng doanh thu</h3>
        <span className="text-sm text-gray-400">{periodLabel}</span>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatDate(value, groupBy)}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#2a2a2a' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatAbbreviatedVND}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: '#6b7280', fontSize: 12, paddingTop: 8 }}
              formatter={(value) => SERIES_LABELS[value] ?? value}
            />
            <Bar
              yAxisId="left"
              dataKey="revenue_platform"
              name="revenue_platform"
              stackId="rev"
              fill="#D4A843"
              barSize={groupBy === 'day' ? 20 : 40}
            />
            <Bar
              yAxisId="left"
              dataKey="revenue_external"
              name="revenue_external"
              stackId="rev"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              barSize={groupBy === 'day' ? 20 : 40}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              name="orders"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
