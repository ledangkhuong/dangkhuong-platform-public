"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface DeviceDatum {
  device: string;
  label: string;
  contacts: number;
  customers: number;
}

interface Props {
  data: DeviceDatum[];
}

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#3b82f6",
  tablet: "#a855f7",
  desktop: "#22c55e",
  unknown: "#6b7280",
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload as DeviceDatum;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ background: "#1a1a1a", borderColor: "#2a2a2a" }}
    >
      <p className="text-sm font-medium text-white">{item.label}</p>
      <p className="text-xs text-gray-400">
        Contacts: <span className="text-white">{item.contacts}</span>
      </p>
      <p className="text-xs text-gray-400">
        Customers: <span className="text-white">{item.customers}</span>
      </p>
    </div>
  );
}

export default function DevicePieChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.contacts, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        Chưa có dữ liệu thiết bị
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          dataKey="contacts"
          nameKey="label"
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell
              key={entry.device}
              fill={DEVICE_COLORS[entry.device] ?? "#6b7280"}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white text-2xl font-bold"
        >
          {total}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-400 text-xs"
        >
          contacts
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}
