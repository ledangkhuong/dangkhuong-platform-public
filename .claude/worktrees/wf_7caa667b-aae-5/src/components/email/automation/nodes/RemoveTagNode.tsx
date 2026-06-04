"use client";
import { Handle, Position } from "@xyflow/react";
import { Tag, X } from "lucide-react";

export default function RemoveTagNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl border border-[#ec4899] bg-[#111] min-w-[180px] shadow-lg shadow-pink-900/20">
      <Handle type="target" position={Position.Top} className="!bg-[#ec4899] !w-3 !h-3 !border-2 !border-[#111]" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#ec489920] flex items-center justify-center relative">
          <Tag size={14} className="text-[#ec4899]" />
          <X size={8} className="text-[#ec4899] absolute -top-0.5 -right-0.5" />
        </div>
        <div>
          <div className="text-[10px] text-[#ec4899] font-bold uppercase">Xoá Tag</div>
          <div className="text-xs text-white font-medium">{data.tagName || "Chưa chọn tag"}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#ec4899] !w-3 !h-3 !border-2 !border-[#111]" />
    </div>
  );
}
