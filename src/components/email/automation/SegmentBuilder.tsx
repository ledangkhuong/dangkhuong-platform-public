"use client";

import { useState, useEffect } from "react";
import { Tag, List, Filter, Users, X, Plus, Search } from "lucide-react";

interface SegmentCondition {
  type: "has_tag" | "in_list" | "status" | "subscribed_after" | "subscribed_before";
  value: string;
  operator: "and" | "or";
}

interface SegmentBuilderProps {
  onSegmentChange: (conditions: SegmentCondition[]) => void;
  onPreview?: (subscriberIds: string[]) => void;
  compact?: boolean;
}

export default function SegmentBuilder({ onSegmentChange, onPreview, compact }: SegmentBuilderProps) {
  const [conditions, setConditions] = useState<SegmentCondition[]>([
    { type: "has_tag", value: "", operator: "and" }
  ]);
  const [tags, setTags] = useState<{ name: string; color: string }[]>([]);
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch tags and lists for autocomplete
  useEffect(() => {
    Promise.all([
      fetch("/api/email/tags").then(r => r.json()),
      fetch("/api/email/lists").then(r => r.json()),
    ]).then(([tagsData, listsData]) => {
      setTags((tagsData.tags || []).map((t: any) => ({ name: t.name, color: t.color })));
      setLists((listsData.lists || listsData || []).map((l: any) => ({ id: l.id, name: l.name })));
    }).catch(() => {});
  }, []);

  const addCondition = () => {
    setConditions([...conditions, { type: "has_tag", value: "", operator: "and" }]);
  };

  const removeCondition = (index: number) => {
    const newConds = conditions.filter((_, i) => i !== index);
    setConditions(newConds);
    onSegmentChange(newConds);
  };

  const updateCondition = (index: number, updates: Partial<SegmentCondition>) => {
    const newConds = conditions.map((c, i) => i === index ? { ...c, ...updates } : c);
    setConditions(newConds);
    onSegmentChange(newConds);
  };

  const previewSegment = async () => {
    setLoadingPreview(true);
    try {
      // Build query based on conditions
      const tagConditions = conditions.filter(c => c.type === "has_tag" && c.value);
      if (tagConditions.length > 0) {
        const tagsParam = tagConditions.map(c => c.value).join(",");
        const match = conditions[0]?.operator === "or" ? "any" : "all";
        const res = await fetch(`/api/email/subscribers/by-tag?tags=${tagsParam}&match=${match}&status=active`);
        const data = await res.json();
        setPreviewCount(data.total ?? 0);
        onPreview?.(data.subscribers?.map((s: any) => s.id) || []);
      }
    } catch {
      setPreviewCount(null);
    }
    setLoadingPreview(false);
  };

  return (
    <div className={`space-y-3 ${compact ? "" : "p-4 bg-[#151515] rounded-xl border border-[#2a2a2a]"}`}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Filter size={14} className="text-[#D4A843]" />
            Segment Builder
          </h3>
          {previewCount !== null && (
            <span className="text-xs text-[#D4A843] font-medium">
              {previewCount} subscribers khớp
            </span>
          )}
        </div>
      )}

      {/* Conditions */}
      <div className="space-y-2">
        {conditions.map((cond, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx > 0 && (
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(idx, { operator: e.target.value as "and" | "or" })}
                className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-[10px] text-gray-400 w-14"
              >
                <option value="and">VÀ</option>
                <option value="or">HOẶC</option>
              </select>
            )}
            {idx === 0 && <div className="w-14 text-[10px] text-gray-500 text-center">Nếu</div>}

            <select
              value={cond.type}
              onChange={(e) => updateCondition(idx, { type: e.target.value as SegmentCondition["type"], value: "" })}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white flex-shrink-0"
            >
              <option value="has_tag">Có tag</option>
              <option value="in_list">Trong list</option>
              <option value="status">Trạng thái</option>
              <option value="subscribed_after">Đăng ký sau</option>
            </select>

            {/* Value input based on type */}
            {cond.type === "has_tag" && (
              <select
                value={cond.value}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white flex-1 min-w-0"
              >
                <option value="">Chọn tag...</option>
                {tags.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            )}

            {cond.type === "in_list" && (
              <select
                value={cond.value}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white flex-1 min-w-0"
              >
                <option value="">Chọn list...</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}

            {cond.type === "status" && (
              <select
                value={cond.value}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white flex-1 min-w-0"
              >
                <option value="">Chọn...</option>
                <option value="active">Active</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="bounced">Bounced</option>
              </select>
            )}

            {cond.type === "subscribed_after" && (
              <input
                type="date"
                value={cond.value}
                onChange={(e) => updateCondition(idx, { value: e.target.value })}
                className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1.5 text-xs text-white flex-1 min-w-0"
              />
            )}

            <button
              onClick={() => removeCondition(idx)}
              className="p-1 rounded hover:bg-[#222] text-gray-600 hover:text-red-400"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={addCondition}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <Plus size={12} />
          Thêm điều kiện
        </button>
        <button
          onClick={previewSegment}
          disabled={loadingPreview}
          className="flex items-center gap-1 text-xs text-[#D4A843] hover:text-[#e5ba54] transition-colors ml-auto"
        >
          <Users size={12} />
          {loadingPreview ? "Đang tính..." : "Xem trước"}
        </button>
      </div>
    </div>
  );
}
