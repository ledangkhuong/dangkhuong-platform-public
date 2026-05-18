"use client";

import { Mail, Clock, GitBranch, Tag, Tags, Flag, Zap, MousePointer } from "lucide-react";

const nodeCategories = [
  {
    label: "Triggers",
    nodes: [
      { type: "trigger", label: "Trigger", icon: Zap, color: "#22c55e", description: "Bắt đầu automation" },
    ],
  },
  {
    label: "Actions",
    nodes: [
      { type: "sendEmail", label: "Gửi Email", icon: Mail, color: "#3b82f6", description: "Gửi email cho subscriber" },
      { type: "addTag", label: "Thêm Tag", icon: Tag, color: "#8b5cf6", description: "Gắn tag cho subscriber" },
      { type: "removeTag", label: "Xoá Tag", icon: Tags, color: "#ec4899", description: "Xoá tag khỏi subscriber" },
    ],
  },
  {
    label: "Logic",
    nodes: [
      { type: "wait", label: "Chờ", icon: Clock, color: "#f59e0b", description: "Chờ X ngày/giờ" },
      { type: "condition", label: "Điều kiện", icon: GitBranch, color: "#14b8a6", description: "Phân nhánh theo điều kiện" },
    ],
  },
  {
    label: "End",
    nodes: [
      { type: "end", label: "Kết thúc", icon: Flag, color: "#ef4444", description: "Kết thúc automation" },
    ],
  },
];

export default function NodeSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-56 border-r border-[#2a2a2a] bg-[#111] overflow-y-auto p-3 space-y-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
        Kéo thả vào canvas
      </div>

      {nodeCategories.map((cat) => (
        <div key={cat.label}>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
            {cat.label}
          </div>
          <div className="space-y-1.5">
            {cat.nodes.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all border border-transparent hover:border-[#333] hover:bg-[#1a1a1a]"
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: node.color + "20" }}
                >
                  <node.icon size={14} style={{ color: node.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{node.label}</div>
                  <div className="text-[10px] text-gray-500 truncate">{node.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
