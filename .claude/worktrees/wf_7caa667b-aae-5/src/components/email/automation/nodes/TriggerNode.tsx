"use client";
import { Handle, Position } from "@xyflow/react";
import { Zap } from "lucide-react";

const triggerLabels: Record<string, string> = {
  tag_added: "Tag được thêm",
  subscribed_to_list: "Đăng ký list",
  manual: "Thủ công",
  purchase: "Mua hàng",
  form_submit: "Gửi form",
};

export default function TriggerNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-3 rounded-xl border-2 border-[#22c55e] bg-[#111] min-w-[180px] shadow-lg shadow-green-900/20">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#22c55e20] flex items-center justify-center">
          <Zap size={14} className="text-[#22c55e]" />
        </div>
        <div>
          <div className="text-[10px] text-[#22c55e] font-bold uppercase">Trigger</div>
          <div className="text-xs text-white font-medium">{triggerLabels[data.triggerType] || "Thủ công"}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#22c55e] !w-3 !h-3 !border-2 !border-[#111]" />
    </div>
  );
}
