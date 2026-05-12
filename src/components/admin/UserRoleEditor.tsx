"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";

type Role = "student" | "admin" | "manager" | "marketing" | "sale" | "support";
type Tier = "free" | "member" | "vip";

interface UserRoleEditorProps {
  userId: string;
  currentRole: Role;
  currentTier: Tier;
  myRole: Role;
}

const roleOptions: { value: Role; label: string }[] = [
  { value: "student", label: "Học viên" },
  { value: "support", label: "CSKH" },
  { value: "sale", label: "Sale" },
  { value: "marketing", label: "Marketing" },
  { value: "manager", label: "Quản lý" },
  { value: "admin", label: "Admin" },
];

const tierOptions: { value: Tier; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "member", label: "Member" },
  { value: "vip", label: "VIP" },
];

export default function UserRoleEditor({
  userId,
  currentRole,
  currentTier,
  myRole,
}: UserRoleEditorProps) {
  const [role, setRole] = useState<Role>(currentRole);
  const [tier, setTier] = useState<Tier>(currentTier);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = role !== currentRole || tier !== currentTier;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const body: Record<string, string> = { user_id: userId };
      if (role !== currentRole) body.role = role;
      if (tier !== currentTier) body.tier = tier;

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const json = await res.json();
        setError(json.error || "Lỗi cập nhật");
        // Revert
        setRole(currentRole);
        setTier(currentTier);
      }
    } catch {
      setError("Lỗi kết nối");
      setRole(currentRole);
      setTier(currentTier);
    } finally {
      setSaving(false);
    }
  };

  // Filter role options: only admin can assign admin role
  const availableRoles = roleOptions.filter(
    (r) => r.value !== "admin" || myRole === "admin"
  );

  return (
    <div className="flex items-center gap-2">
      {/* Role select */}
      <select
        value={role}
        onChange={(e) => {
          setRole(e.target.value as Role);
          setError(null);
          setSaved(false);
        }}
        className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#D4A843]/50 transition-colors"
      >
        {availableRoles.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {/* Tier select */}
      <select
        value={tier}
        onChange={(e) => {
          setTier(e.target.value as Tier);
          setError(null);
          setSaved(false);
        }}
        className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#D4A843]/50 transition-colors"
      >
        {tierOptions.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Save button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30 text-xs px-2 py-1 rounded-lg hover:bg-[#D4A843]/25 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          Lưu
        </button>
      )}

      {/* Success indicator */}
      {saved && !hasChanges && (
        <span className="text-[10px] text-[#D4A843] flex items-center gap-1">
          <Check size={10} /> Đã lưu
        </span>
      )}

      {/* Error */}
      {error && (
        <span className="text-[10px] text-red-400">{error}</span>
      )}
    </div>
  );
}
