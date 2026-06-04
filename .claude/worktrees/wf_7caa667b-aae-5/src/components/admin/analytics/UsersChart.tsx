'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UsersChartProps {
  data: Array<{ date: string; newUsers: number; newEnrollments: number }>;
  groupBy: 'day' | 'month';
  loading?: boolean;
}

function formatDate(date: string, groupBy: 'day' | 'month'): string {
  if (groupBy === 'month') {
    const parts = date.split('-');
    if (parts.length >= 2) {
      return `${parts[1]}/${parts[0]}`;
    }
    return date;
  }
  const parts = date.split('-');
  if (parts.length >= 3) {
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
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ backgroundColor: '#1a1a1a', borderColor: '#2a2a2a' }}
    >
      <p className="mb-1 text-sm text-gray-400">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function UsersChart({ data, groupBy, loading }: UsersChartProps) {
  if (loading) {
    return (
      <div className="card-dark p-5">
        <div className="mb-4 h-5 w-48 animate-pulse rounded bg-gray-700" />
        <div className="h-[300px] w-full animate-pulse rounded bg-gray-800" />
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: formatDate(item.date, groupBy),
  }));

  return (
    <div className="card-dark p-5">
      <h3 className="mb-4 text-lg font-semibold text-white">Tăng trưởng học viên</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNewEnrollments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ paddingBottom: '10px' }}
            />
            <Area
              type="monotone"
              dataKey="newUsers"
              name="New Users"
              stroke="#3b82f6"
              fill="url(#colorNewUsers)"
              fillOpacity={1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="newEnrollments"
              name="New Enrollments"
              stroke="#10b981"
              fill="url(#colorNewEnrollments)"
              fillOpacity={1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
