"use client";
import { Handle, Position } from "@xyflow/react";
import { Clock } from "lucide-react";

export default function WaitNode({ data }: { data: any }) {
  const parts = [];
  if (data.days) parts.push(`${data.days} ngày`);
  if (data.hours) parts.push(`${data.hours} giờ`);
  if (data.minutes) parts.push(`${data.minutes} phút`);
  const label = parts.length > 0 ? parts.join(" ") : "Chưa cấu hình";

  return (
    <div className="px-4 py-3 rounded-xl border border-[#f59e0b] bg-[#111] min-w-[180px] shadow-lg shadow-amber-900/20">
      <Handle type="target" position={Position.Top} className="!bg-[#f59e0b] !w-3 !h-3 !border-2 !border-[#111]" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#f59e0b20] flex items-center justify-center">
          <Clock size={14} className="text-[#f59e0b]" />
        </div>
        <div>
          <div className="text-[10px] text-[#f59e0b] font-bold uppercase">Chờ</div>
          <div className="text-xs text-white font-medium">{label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#f59e0b] !w-3 !h-3 !border-2 !border-[#111]" />
    </div>
  );
}
