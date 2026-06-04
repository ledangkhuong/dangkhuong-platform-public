"use client";
import { Handle, Position } from "@xyflow/react";
import { Tag } from "lucide-react";

export default function AddTagNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl border border-[#8b5cf6] bg-[#111] min-w-[180px] shadow-lg shadow-purple-900/20">
      <Handle type="target" position={Position.Top} className="!bg-[#8b5cf6] !w-3 !h-3 !border-2 !border-[#111]" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#8b5cf620] flex items-center justify-center">
          <Tag size={14} className="text-[#8b5cf6]" />
        </div>
        <div>
          <div className="text-[10px] text-[#8b5cf6] font-bold uppercase">Thêm Tag</div>
          <div className="text-xs text-white font-medium">{data.tagName || "Chưa chọn tag"}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#8b5cf6] !w-3 !h-3 !border-2 !border-[#111]" />
    </div>
  );
}
