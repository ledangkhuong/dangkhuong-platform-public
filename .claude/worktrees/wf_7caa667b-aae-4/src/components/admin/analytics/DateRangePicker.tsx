"use client";

import { subDays, startOfYear, format } from "date-fns";

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  groupBy: "day" | "month";
  onGroupByChange: (v: "day" | "month") => void;
}

const today = () => format(new Date(), "yyyy-MM-dd");

const presets = [
  { label: "7 ngày", getRange: () => ({ from: format(subDays(new Date(), 7), "yyyy-MM-dd"), to: today() }) },
  { label: "30 ngày", getRange: () => ({ from: format(subDays(new Date(), 30), "yyyy-MM-dd"), to: today() }) },
  { label: "90 ngày", getRange: () => ({ from: format(subDays(new Date(), 90), "yyyy-MM-dd"), to: today() }) },
  { label: "Năm nay", getRange: () => ({ from: format(startOfYear(new Date()), "yyyy-MM-dd"), to: today() }) },
  { label: "Tất cả", getRange: () => ({ from: "2024-01-01", to: today() }) },
];

export default function DateRangePicker({
  from,
  to,
  onChange,
  groupBy,
  onGroupByChange,
}: DateRangePickerProps) {
  const isPresetActive = (preset: (typeof presets)[number]) => {
    const range = preset.getRange();
    return from === range.from && to === range.to;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      {presets.map((preset) => {
        const active = isPresetActive(preset);
        return (
          <button
            key={preset.label}
            onClick={() => {
              const range = preset.getRange();
              onChange(range.from, range.to);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              active
                ? "bg-[#D4A843]/20 text-[#D4A843] border-[#D4A843]/30"
                : "bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:bg-[#222]"
            }`}
          >
            {preset.label}
          </button>
        );
      })}

      {/* Custom date inputs */}
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="bg-[#151515] border border-[#2a2a2a] text-white rounded-lg px-3 py-1.5 text-sm"
      />
      <span className="text-gray-500 text-sm">–</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="bg-[#151515] border border-[#2a2a2a] text-white rounded-lg px-3 py-1.5 text-sm"
      />

      {/* GroupBy toggle */}
      <div className="flex items-center gap-1 ml-2">
        <button
          onClick={() => onGroupByChange("day")}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            groupBy === "day"
              ? "bg-[#D4A843]/20 text-[#D4A843] border-[#D4A843]/30"
              : "bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:bg-[#222]"
          }`}
        >
          Theo ngày
        </button>
        <button
          onClick={() => onGroupByChange("month")}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            groupBy === "month"
              ? "bg-[#D4A843]/20 text-[#D4A843] border-[#D4A843]/30"
              : "bg-[#1a1a1a] text-gray-400 border-[#2a2a2a] hover:bg-[#222]"
          }`}
        >
          Theo tháng
        </button>
      </div>

      {/* Export button */}
      <button
        className="ml-auto px-4 py-1.5 text-sm rounded-lg border border-[#D4A843]/30 bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20 transition-colors"
        onClick={() => {
          // Placeholder - no functionality
        }}
      >
        Xuất báo cáo
      </button>
    </div>
  );
}
