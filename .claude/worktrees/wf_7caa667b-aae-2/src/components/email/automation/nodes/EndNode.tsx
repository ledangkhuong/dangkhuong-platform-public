"use client";
import { Handle, Position } from "@xyflow/react";
import { Flag } from "lucide-react";

export default function EndNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl border border-[#ef4444] bg-[#111] min-w-[140px] shadow-lg shadow-red-900/20">
      <Handle type="target" position={Position.Top} className="!bg-[#ef4444] !w-3 !h-3 !border-2 !border-[#111]" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#ef444420] flex items-center justify-center">
          <Flag size={14} className="text-[#ef4444]" />
        </div>
        <div>
          <div className="text-[10px] text-[#ef4444] font-bold uppercase">Kết thúc</div>
          <div className="text-xs text-gray-400">Automation hoàn tất</div>
        </div>
      </div>
    </div>
  );
}
