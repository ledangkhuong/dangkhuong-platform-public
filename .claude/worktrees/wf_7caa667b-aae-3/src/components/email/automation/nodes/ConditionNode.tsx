"use client";
import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";

const conditionLabels: Record<string, string> = {
  opened_email: "Đã mở email",
  clicked_link: "Đã click link",
  has_tag: "Có tag",
  in_list: "Trong list",
  custom_field: "Trường tuỳ chỉnh",
};

export default function ConditionNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl border border-[#14b8a6] bg-[#111] min-w-[200px] shadow-lg shadow-teal-900/20">
      <Handle type="target" position={Position.Top} className="!bg-[#14b8a6] !w-3 !h-3 !border-2 !border-[#111]" />
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#14b8a620] flex items-center justify-center">
          <GitBranch size={14} className="text-[#14b8a6]" />
        </div>
        <div>
          <div className="text-[10px] text-[#14b8a6] font-bold uppercase">Điều kiện</div>
          <div className="text-xs text-white font-medium">
            {conditionLabels[data.conditionType] || "Chưa cấu hình"}
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-[9px] px-2">
        <span className="text-green-400">Có ✓</span>
        <span className="text-red-400">Không ✗</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="!bg-[#22c55e] !w-2.5 !h-2.5 !border-2 !border-[#111] !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="no" className="!bg-[#ef4444] !w-2.5 !h-2.5 !border-2 !border-[#111] !left-[70%]" />
    </div>
  );
}
