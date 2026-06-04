"use client";

import React from "react";

interface ConversionFunnelProps {
  totalUsers: number;
  enrolledUsers: number;
  paidUsers: number;
  completedUsers: number;
  loading?: boolean;
}

interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

export default function ConversionFunnel({
  totalUsers,
  enrolledUsers,
  paidUsers,
  completedUsers,
  loading = false,
}: ConversionFunnelProps) {
  const steps: FunnelStep[] = [
    { label: "Đăng ký", count: totalUsers, color: "#3b82f6" },
    { label: "Ghi danh", count: enrolledUsers, color: "#06b6d4" },
    { label: "Thanh toán", count: paidUsers, color: "#10b981" },
    { label: "Hoàn thành", count: completedUsers, color: "#D4A843" },
  ];

  const getConversionRate = (current: number, previous: number): string => {
    if (previous === 0) return "0%";
    return ((current / previous) * 100).toFixed(1) + "%";
  };

  const getBarWidthPercent = (count: number): number => {
    if (totalUsers === 0) return 0;
    return (count / totalUsers) * 100;
  };

  const getBiggestDrop = (): string => {
    let maxDrop = 0;
    let dropStep = "";

    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1].count;
      const curr = steps[i].count;
      const drop = prev - curr;
      if (drop > maxDrop) {
        maxDrop = drop;
        dropStep = `${steps[i - 1].label} → ${steps[i].label}`;
      }
    }

    return dropStep || "Không có";
  };

  if (loading) {
    return (
      <div className="card-dark p-5">
        <div className="h-5 w-48 bg-white/10 rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                <div
                  className="h-8 bg-white/10 rounded animate-pulse"
                  style={{ width: `${100 - (i - 1) * 20}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-dark p-5">
      <h3 className="text-lg font-semibold text-white mb-6">
        Phễu chuyển đổi
      </h3>

      {/* Funnel visualization */}
      <div className="space-y-3 mb-6">
        {steps.map((step, index) => {
          const conversionRate =
            index === 0
              ? "100%"
              : getConversionRate(step.count, steps[index - 1].count);
          const barWidth = Math.max(getBarWidthPercent(step.count), 8);

          return (
            <div key={step.label} className="flex items-center gap-3">
              {/* Step number circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: step.color }}
              >
                {index + 1}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-400">{step.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">
                      {step.count.toLocaleString()}
                    </span>
                    {index > 0 && (
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded"
                        style={{
                          color: step.color,
                          backgroundColor: `${step.color}26`,
                        }}
                      >
                        {conversionRate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div
                  className="h-8 rounded-md transition-all duration-500 ease-out"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: `${step.color}26`,
                    borderLeft: `3px solid ${step.color}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Biggest drop */}
      <div className="text-sm text-gray-400 mb-6">
        Điểm rơi lớn nhất:{" "}
        <span className="text-white font-medium">{getBiggestDrop()}</span>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-gray-400 font-medium py-2 pr-4">
                Bước
              </th>
              <th className="text-right text-gray-400 font-medium py-2 px-4">
                Số lượng
              </th>
              <th className="text-right text-gray-400 font-medium py-2 px-4">
                Tỷ lệ chuyển đổi
              </th>
              <th className="text-right text-gray-400 font-medium py-2 pl-4">
                Tỷ lệ so với bước 1
              </th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step, index) => {
              const conversionFromPrev =
                index === 0
                  ? "—"
                  : getConversionRate(step.count, steps[index - 1].count);
              const conversionFromFirst =
                index === 0
                  ? "100%"
                  : getConversionRate(step.count, steps[0].count);

              return (
                <tr key={step.label} className="border-b border-white/5">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: step.color }}
                      />
                      <span className="text-white">{step.label}</span>
                    </div>
                  </td>
                  <td className="text-right text-white py-2 px-4">
                    {step.count.toLocaleString()}
                  </td>
                  <td className="text-right text-gray-400 py-2 px-4">
                    {conversionFromPrev}
                  </td>
                  <td className="text-right text-gray-400 py-2 pl-4">
                    {conversionFromFirst}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
