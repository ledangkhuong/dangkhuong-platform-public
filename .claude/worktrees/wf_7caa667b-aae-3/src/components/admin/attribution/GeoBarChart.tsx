"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface CountryDatum {
  country: string;
  contacts: number;
  customers: number;
  conversionRate: number;
}

interface Props {
  data: CountryDatum[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload as CountryDatum;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ background: "#1a1a1a", borderColor: "#2a2a2a" }}
    >
      <p className="text-sm font-medium text-white">{item.country}</p>
      <p className="text-xs text-gray-400">
        Contacts: <span className="text-white">{item.contacts}</span>
      </p>
      <p className="text-xs text-gray-400">
        Customers: <span className="text-white">{item.customers}</span>
      </p>
      <p className="text-xs text-gray-400">
        Conversion:{" "}
        <span className="text-white">{item.conversionRate.toFixed(1)}%</span>
      </p>
    </div>
  );
}

export default function GeoBarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
        Chưa có dữ liệu quốc gia
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36 + 40)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#2a2a2a"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={{ stroke: "#2a2a2a" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="country"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={{ stroke: "#2a2a2a" }}
          tickLine={false}
          width={120}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(212,168,67,0.08)" }}
        />
        <Bar
          dataKey="contacts"
          fill="#D4A843"
          radius={[0, 4, 4, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
