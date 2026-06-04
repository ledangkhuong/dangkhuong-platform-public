'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface OrderStatusPieProps {
  data: Array<{ status: string; count: number; revenue: number }>;
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  paid: '#10b981',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  refunded: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Đã thanh toán',
  pending: 'Chờ xử lý',
  cancelled: 'Đã huỷ',
  refunded: 'Hoàn tiền',
};

function formatRevenue(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString('vi-VN');
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;
  return (
    <div className="rounded-lg border px-3 py-2 shadow-lg" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
      <p className="text-sm font-medium text-white">
        {STATUS_LABELS[item.status] || item.status}
      </p>
      <p className="text-xs text-gray-400">
        Số đơn: <span className="text-white">{item.count}</span>
      </p>
      <p className="text-xs text-gray-400">
        Doanh thu: <span className="text-white">{item.revenue.toLocaleString('vi-VN')}đ</span>
      </p>
    </div>
  );
}

function CustomLegend({ payload, data }: any) {
  return (
    <div className="flex flex-col justify-center gap-3 pl-4">
      {data.map((item: any) => (
        <div key={item.status} className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[item.status] || '#6b7280' }}
          />
          <div className="flex flex-col">
            <span className="text-sm text-gray-400">
              {STATUS_LABELS[item.status] || item.status}
            </span>
            <span className="text-xs text-gray-500">
              {item.count} đơn &middot; {formatRevenue(item.revenue)}đ
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="card-dark p-5">
      <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-700" />
      <div className="flex items-center justify-center">
        <div className="h-48 w-48 animate-pulse rounded-full bg-gray-700" />
        <div className="ml-6 flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-gray-700" />
              <div className="h-4 w-28 animate-pulse rounded bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrderStatusPie({ data, loading }: OrderStatusPieProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  const totalOrders = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="card-dark p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">Trạng thái đơn hàng</h3>

      <div className="flex items-center">
        <ResponsiveContainer width="60%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="count"
              nameKey="status"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] || '#6b7280'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {/* Center text */}
            <text
              x="50%"
              y="46%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white text-2xl font-bold"
            >
              {totalOrders}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-gray-400 text-xs"
            >
              đơn hàng
            </text>
          </PieChart>
        </ResponsiveContainer>

        <div className="w-[40%]">
          <CustomLegend data={data} />
        </div>
      </div>
    </div>
  );
}
