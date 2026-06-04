"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RevenueComparisonProps {
  currentData: Array<{ date: string; revenue: number }>;
  previousData: Array<{ date: string; revenue: number }>;
  loading?: boolean;
}

function formatRevenue(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 shadow-lg">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {new Intl.NumberFormat('vi-VN').format(entry.value)} VND
        </p>
      ))}
    </div>
  );
}

export default function RevenueComparison({ currentData, previousData, loading }: RevenueComparisonProps) {
  if (loading) {
    return (
      <div className="card-dark p-5">
        <div className="h-5 w-48 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  const maxLength = Math.max(currentData.length, previousData.length);
  const mergedData = Array.from({ length: maxLength }, (_, index) => ({
    day: `Day ${index + 1}`,
    current: currentData[index]?.revenue ?? null,
    previous: previousData[index]?.revenue ?? null,
  }));

  return (
    <div className="card-dark p-5">
      <h3 className="text-lg font-semibold text-white mb-4">So sánh doanh thu</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mergedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="day"
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickFormatter={(value) => `${formatRevenue(value)} VND`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="current"
            name="Kỳ hiện tại"
            stroke="#D4A843"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="previous"
            name="Kỳ trước"
            stroke="#6b7280"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
