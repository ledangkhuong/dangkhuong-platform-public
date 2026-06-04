"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface OrdersChartProps {
  dailyOrders: Array<{ date: string; paid: number; pending: number; cancelled: number; total: number }>;
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 shadow-lg">
        <p className="text-gray-300 text-sm font-medium mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function OrdersChart({ dailyOrders, loading }: OrdersChartProps) {
  if (loading) {
    return (
      <div className="card-dark p-5">
        <div className="h-5 w-48 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-[300px] bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  const formattedData = dailyOrders.map((item) => {
    const [year, month, day] = item.date.split('-');
    return {
      ...item,
      formattedDate: `${day}/${month}`,
    };
  });

  return (
    <div className="card-dark p-5">
      <h3 className="text-lg font-semibold text-white mb-4">Đơn hàng theo ngày</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={{ stroke: '#2a2a2a' }}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={{ stroke: '#2a2a2a' }}
            tickLine={{ stroke: '#2a2a2a' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value: string) => <span className="text-gray-300 text-sm">{value}</span>}
          />
          <Bar dataKey="paid" name="Đã thanh toán" stackId="orders" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="pending" name="Chờ xử lý" stackId="orders" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="cancelled" name="Đã huỷ" stackId="orders" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
