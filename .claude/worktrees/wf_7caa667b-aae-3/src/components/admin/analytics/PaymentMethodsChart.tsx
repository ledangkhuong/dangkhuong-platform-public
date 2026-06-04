'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PaymentMethodsChartProps {
  data: Array<{ method: string; count: number }>;
  loading?: boolean;
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Chuyển khoản',
  manual: 'Xác nhận thủ công',
  sepay: 'SePay',
  other: 'Khác',
};

function getMethodLabel(method: string | null | undefined): string {
  if (!method) return METHOD_LABELS.other;
  return METHOD_LABELS[method] || METHOD_LABELS.other;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0].payload;
  return (
    <div className="rounded-lg border px-3 py-2 shadow-lg" style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
      <p className="text-sm font-medium text-white">{item.label}</p>
      <p className="text-xs text-gray-400">
        Số lượng: <span className="text-white">{item.count}</span>
      </p>
      <p className="text-xs text-gray-400">
        Tỷ lệ: <span className="text-white">{item.percentage}%</span>
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="card-dark p-5">
      <div className="mb-4 h-5 w-56 animate-pulse rounded bg-gray-700" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-700" />
            <div className="h-6 animate-pulse rounded bg-gray-700" style={{ width: `${80 - i * 15}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaymentMethodsChart({ data, loading }: PaymentMethodsChartProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = data.map((item) => ({
    ...item,
    label: getMethodLabel(item.method),
    percentage: totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : '0.0',
  }));

  return (
    <div className="card-dark p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">Phương thức thanh toán</h3>

      <ResponsiveContainer width="100%" height={chartData.length * 60 + 20}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 13 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={false}
            width={130}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
          <Bar
            dataKey="count"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
            barSize={24}
            label={({ x, y, width, value, index }: any) => {
              const item = chartData[index];
              return (
                <text
                  x={x + width + 8}
                  y={y + 12}
                  fill="#6b7280"
                  fontSize={12}
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {item.percentage}%
                </text>
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
