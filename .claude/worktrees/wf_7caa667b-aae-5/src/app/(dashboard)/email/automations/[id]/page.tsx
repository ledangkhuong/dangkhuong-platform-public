"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import FlowBuilder from "@/components/email/automation/FlowBuilder";
import { ArrowLeft, Save, Play, Pause, Settings } from "lucide-react";
import Link from "next/link";

export default function AutomationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [automation, setAutomation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch automation
  useEffect(() => {
    fetch(`/api/email/automations/${id}`)
      .then(r => r.json())
      .then(data => { setAutomation(data.automation); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  // Save flow
  const handleSave = async (flowDefinition: any) => {
    setSaving(true);
    await fetch(`/api/email/automations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flow_definition: flowDefinition }),
    });
    setSaving(false);
    setHasChanges(false);
  };

  // Toggle active/pause
  const handleToggleStatus = async () => {
    const action = automation.status === "active" ? "pause" : "activate";
    const res = await fetch(`/api/email/automations/${id}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setAutomation((a: any) => ({ ...a, status: data.automation.status }));
  };

  if (loading) return <LoadingSkeleton />;
  if (!automation) return <NotFound />;

  return (
    <div className="h-screen flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <Link href="/email/automations" className="text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-white font-semibold text-sm">{automation.name}</h1>
            <p className="text-xs text-gray-500">{automation.description || "Automation flow builder"}</p>
          </div>
          {/* Status badge */}
          <StatusBadge status={automation.status} />
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <span className="text-xs text-[#f59e0b]">Chưa lưu</span>}
          <button onClick={() => handleSave(automation.flow_definition)} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D4A843] text-black">
            <Save size={13} />
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
          <button onClick={handleToggleStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#333] text-gray-300 hover:text-white">
            {automation.status === "active" ? <><Pause size={13} /> Tạm dừng</> : <><Play size={13} /> Kích hoạt</>}
          </button>
        </div>
      </div>

      {/* Flow Builder - takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <FlowBuilder
          initialFlow={automation.flow_definition}
          onChange={(flow) => {
            setAutomation((a: any) => ({ ...a, flow_definition: flow }));
            setHasChanges(true);
          }}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    draft: { label: "Bản nháp", color: "#6b7280" },
    active: { label: "Đang hoạt động", color: "#22c55e" },
    paused: { label: "Tạm dừng", color: "#f59e0b" },
    archived: { label: "Đã lưu trữ", color: "#ef4444" },
  };
  const c = config[status] || config.draft;
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: c.color + "20", color: c.color }}>
      {c.label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="animate-pulse text-gray-500">Đang tải...</div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <p className="text-gray-400">Không tìm thấy automation</p>
        <Link href="/email/automations" className="text-[#D4A843] text-sm mt-2 inline-block">← Quay lại</Link>
      </div>
    </div>
  );
}
