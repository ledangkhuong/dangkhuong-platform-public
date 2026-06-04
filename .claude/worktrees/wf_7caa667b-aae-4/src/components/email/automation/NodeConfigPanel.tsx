"use client";

import { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { X, Trash2, Mail, Clock, GitBranch, Tag, Zap, Flag } from "lucide-react";

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, data: any) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  return (
    <div className="w-72 border-l border-[#2a2a2a] bg-[#111] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <h3 className="text-sm font-semibold text-white">Cấu hình</h3>
        <div className="flex items-center gap-1">
          {node.type !== "trigger" && (
            <button
              onClick={() => onDelete(node.id)}
              className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
              title="Xoá node"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#222] text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Config content based on node type */}
      <div className="p-4 space-y-4">
        {node.type === "trigger" && <TriggerConfig data={node.data} onChange={(d) => onUpdate(node.id, d)} />}
        {node.type === "sendEmail" && <SendEmailConfig data={node.data} onChange={(d) => onUpdate(node.id, d)} />}
        {node.type === "wait" && <WaitConfig data={node.data} onChange={(d) => onUpdate(node.id, d)} />}
        {node.type === "condition" && <ConditionConfig data={node.data} onChange={(d) => onUpdate(node.id, d)} />}
        {node.type === "addTag" && <TagConfig data={node.data} onChange={(d) => onUpdate(node.id, d)} label="Thêm tag" />}
        {node.type === "removeTag" && <TagConfig data={node.data} onChange={(d) => onUpdate(node.id, d)} label="Xoá tag" />}
        {node.type === "end" && <EndConfig />}
      </div>
    </div>
  );
}

// ─── Trigger Config ─────────────────────────────────────────

function TriggerConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#22c55e]">
        <Zap size={14} />
        <span className="text-xs font-bold uppercase">Trigger</span>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Loại trigger</label>
        <select
          value={data.triggerType || "manual"}
          onChange={(e) => onChange({ ...data, triggerType: e.target.value })}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="manual">Thủ công</option>
          <option value="tag_added">Khi được gắn tag</option>
          <option value="subscribed_to_list">Khi đăng ký list</option>
          <option value="purchase">Khi mua hàng</option>
          <option value="form_submit">Khi gửi form</option>
        </select>
      </div>
      {data.triggerType === "tag_added" && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tên tag</label>
          <input
            value={data.config?.tag || ""}
            onChange={(e) => onChange({ ...data, config: { ...data.config, tag: e.target.value } })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
            placeholder="vd: new-subscriber"
          />
        </div>
      )}
      {data.triggerType === "subscribed_to_list" && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">List ID</label>
          <input
            value={data.config?.listId || ""}
            onChange={(e) => onChange({ ...data, config: { ...data.config, listId: e.target.value } })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
            placeholder="UUID của list"
          />
        </div>
      )}
    </div>
  );
}

// ─── Send Email Config ──────────────────────────────────────

function SendEmailConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#3b82f6]">
        <Mail size={14} />
        <span className="text-xs font-bold uppercase">Gửi Email</span>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Tiêu đề email</label>
        <input
          value={data.subject || ""}
          onChange={(e) => onChange({ ...data, subject: e.target.value })}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
          placeholder="Nhập tiêu đề..."
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Template ID (tuỳ chọn)</label>
        <input
          value={data.templateId || ""}
          onChange={(e) => onChange({ ...data, templateId: e.target.value })}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
          placeholder="Chọn template..."
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Nội dung HTML (nếu không dùng template)</label>
        <textarea
          value={data.htmlContent || ""}
          onChange={(e) => onChange({ ...data, htmlContent: e.target.value })}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white h-32 resize-none"
          placeholder="<html>...</html>"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Tên người gửi</label>
        <input
          value={data.fromName || ""}
          onChange={(e) => onChange({ ...data, fromName: e.target.value })}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
          placeholder="Lê Đăng Khương Academy"
        />
      </div>
    </div>
  );
}

// ─── Wait Config ────────────────────────────────────────────

function WaitConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#f59e0b]">
        <Clock size={14} />
        <span className="text-xs font-bold uppercase">Thời gian chờ</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Ngày</label>
          <input
            type="number"
            min={0}
            value={data.days || 0}
            onChange={(e) => onChange({ ...data, days: parseInt(e.target.value) || 0 })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-sm text-white text-center"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Giờ</label>
          <input
            type="number"
            min={0}
            max={23}
            value={data.hours || 0}
            onChange={(e) => onChange({ ...data, hours: parseInt(e.target.value) || 0 })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-sm text-white text-center"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">Phút</label>
          <input
            type="number"
            min={0}
            max={59}
            value={data.minutes || 0}
            onChange={(e) => onChange({ ...data, minutes: parseInt(e.target.value) || 0 })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-2 text-sm text-white text-center"
          />
        </div>
      </div>
      <p className="text-[10px] text-gray-500">Subscriber sẽ chờ khoảng thời gian này trước khi tiếp tục flow</p>
    </div>
  );
}

// ─── Condition Config ───────────────────────────────────────

function ConditionConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#14b8a6]">
        <GitBranch size={14} />
        <span className="text-xs font-bold uppercase">Điều kiện</span>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Loại điều kiện</label>
        <select
          value={data.conditionType || "has_tag"}
          onChange={(e) => onChange({ ...data, conditionType: e.target.value })}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="has_tag">Subscriber có tag</option>
          <option value="opened_email">Đã mở email trước đó</option>
          <option value="clicked_link">Đã click link</option>
          <option value="in_list">Thuộc list</option>
        </select>
      </div>
      {data.conditionType === "has_tag" && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Tên tag</label>
          <input
            value={data.config?.tag || ""}
            onChange={(e) => onChange({ ...data, config: { ...data.config, tag: e.target.value } })}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
            placeholder="vd: vip-customer"
          />
        </div>
      )}
      <div className="flex gap-4 text-xs pt-2">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-gray-400">Có → nhánh trái</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-400">Không → nhánh phải</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tag Config (shared for add/remove) ─────────────────────

function TagConfig({ data, onChange, label }: { data: any; onChange: (d: any) => void; label: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#8b5cf6]">
        <Tag size={14} />
        <span className="text-xs font-bold uppercase">{label}</span>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Tên tag</label>
        <input
          value={data.tagName || ""}
          onChange={(e) => onChange({ ...data, tagName: e.target.value })}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white"
          placeholder="vd: completed-course"
        />
      </div>
    </div>
  );
}

// ─── End Config ─────────────────────────────────────────────

function EndConfig() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#ef4444]">
        <Flag size={14} />
        <span className="text-xs font-bold uppercase">Kết thúc</span>
      </div>
      <p className="text-xs text-gray-500">
        Subscriber sẽ hoàn thành automation khi đến bước này. Không cần cấu hình thêm.
      </p>
    </div>
  );
}
