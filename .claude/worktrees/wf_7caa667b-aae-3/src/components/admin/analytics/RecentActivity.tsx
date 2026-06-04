"use client";

import { ShoppingCart, UserPlus, BookOpen } from "lucide-react";

interface ActivityItem {
  type: "order" | "user" | "enrollment";
  description: string;
  amount?: number;
  time: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

const dotColors: Record<ActivityItem["type"], string> = {
  order: "bg-green-500",
  user: "bg-blue-500",
  enrollment: "bg-yellow-500",
};

const icons: Record<ActivityItem["type"], React.ReactNode> = {
  order: <ShoppingCart className="w-4 h-4 text-green-500" />,
  user: <UserPlus className="w-4 h-4 text-blue-500" />,
  enrollment: <BookOpen className="w-4 h-4 text-yellow-500" />,
};

function SkeletonItem() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg animate-pulse">
      <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a2a] mt-1.5 shrink-0" />
      <div className="w-4 h-4 rounded bg-[#2a2a2a] mt-0.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[#2a2a2a] rounded w-3/4" />
        <div className="h-3 bg-[#2a2a2a] rounded w-1/4" />
      </div>
    </div>
  );
}

export default function RecentActivity({
  activities,
  loading = false,
}: RecentActivityProps) {
  return (
    <div className="card-dark p-5">
      <h3 className="text-white text-lg font-semibold mb-4">
        Hoạt động gần đây
      </h3>

      <div
        className="space-y-1 max-h-[480px] overflow-y-auto border-l border-[#2a2a2a] ml-1"
      >
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonItem key={i} />)
          : activities.slice(0, 10).map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors relative"
              >
                {/* Colored dot */}
                <div
                  className={`w-2.5 h-2.5 rounded-full ${dotColors[item.type]} mt-1.5 shrink-0 -ml-[7px]`}
                />

                {/* Icon */}
                <div className="shrink-0 mt-0.5">{icons[item.type]}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-snug">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.amount !== undefined && (
                      <span className="text-green-400 text-xs font-medium">
                        {formatVND(item.amount)}
                      </span>
                    )}
                    <span className="text-gray-500 text-xs">
                      {timeAgo(item.time)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
