"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import TemplatePreviewModal from "@/components/email/TemplatePreviewModal";
import TemplateEditor, { type TemplateData } from "@/components/email/TemplateEditor";
import {
  Layout, Plus, Eye, Copy, Trash2, Edit, Loader2, FileText, Clock,
  Mail, Search,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
  html_content: string;
  text_content: string;
  updated_at: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "Tat ca" },
  { value: "marketing", label: "Marketing" },
  { value: "newsletter", label: "Newsletter" },
  { value: "transactional", label: "Transactional" },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  marketing: { label: "Marketing", color: "#22c55e" },
  newsletter: { label: "Newsletter", color: "#3b82f6" },
  transactional: { label: "Transactional", color: "#f59e0b" },
  other: { label: "Khac", color: "#6b7280" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<TemplateData> | undefined>(undefined);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/email/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? data ?? []);
      }
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Filter
  const filtered = templates.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q);
    }
    return true;
  });

  // Actions
  const handleCreate = () => {
    setEditingTemplate(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (t: Template) => {
    setEditingTemplate({
      id: t.id,
      name: t.name,
      subject: t.subject,
      category: t.category,
      html_content: t.html_content,
      text_content: t.text_content,
    });
    setEditorOpen(true);
  };

  const handleSave = async (data: TemplateData) => {
    if (data.id) {
      await fetch(`/api/email/templates/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    fetchTemplates();
  };

  const handlePreview = async (t: Template) => {
    // Try preview endpoint first, fallback to stored HTML
    try {
      const res = await fetch(`/api/email/templates/${t.id}/preview`);
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.html ?? data.html_content ?? t.html_content ?? "");
      } else {
        setPreviewHtml(t.html_content ?? "");
      }
    } catch {
      setPreviewHtml(t.html_content ?? "");
    }
    setPreviewSubject(t.subject);
    setPreviewOpen(true);
  };

  const handleDuplicate = async (t: Template) => {
    try {
      await fetch("/api/email/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${t.name} (ban sao)`,
          subject: t.subject,
          category: t.category,
          html_content: t.html_content,
          text_content: t.text_content,
        }),
      });
      fetchTemplates();
    } catch { /* */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ban co chac chan muon xoa template nay?")) return;
    try {
      await fetch(`/api/email/templates/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch { /* */ }
  };

  return (
    <div>
      <TopBar title="Email Templates" subtitle="Quan ly mau email" />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
            >
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tim kiem template..."
                className="bg-transparent border-none outline-none text-white text-sm placeholder:text-gray-600 w-40 sm:w-48"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: category === c.value ? "rgba(34,197,94,0.12)" : "transparent",
                    color: category === c.value ? "#22c55e" : "#9ca3af",
                    border: category === c.value ? "1px solid rgba(34,197,94,0.25)" : "1px solid transparent",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            className="btn-green flex items-center gap-2 text-sm shrink-0"
          >
            <Plus size={15} /> Tao template moi
          </button>
        </div>

        {/* Templates grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[#22c55e]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "rgba(59,130,246,0.1)" }}
            >
              <Layout size={28} className="text-[#3b82f6]" />
            </div>
            <p className="text-white font-medium mb-1">
              {searchQuery || category !== "all"
                ? "Khong tim thay template nao"
                : "Chua co template nao"}
            </p>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || category !== "all"
                ? "Thu thay doi bo loc hoac tu khoa."
                : "Tao template dau tien de bat dau!"}
            </p>
            {!searchQuery && category === "all" && (
              <button onClick={handleCreate} className="btn-green flex items-center gap-2 text-sm">
                <Plus size={15} /> Tao template moi
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const cat = CATEGORY_LABELS[t.category] ?? CATEGORY_LABELS.other;
              return (
                <div
                  key={t.id}
                  className="card-dark hover:border-[#3a3a3a] transition-all group"
                >
                  {/* Card header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: cat.color + "18" }}
                        >
                          <Mail size={14} style={{ color: cat.color }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white text-sm font-semibold truncate">{t.name}</h3>
                          <p className="text-xs text-gray-500 truncate">{t.subject}</p>
                        </div>
                      </div>
                    </div>

                    {/* Category + date */}
                    <div className="flex items-center justify-between mt-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: cat.color + "18", color: cat.color }}
                      >
                        {cat.label}
                      </span>
                      <span className="text-[11px] text-gray-600 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(t.updated_at || t.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center border-t border-[#2a2a2a] divide-x divide-[#2a2a2a]"
                  >
                    <button
                      onClick={() => handleEdit(t)}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                    >
                      <Edit size={12} /> Sua
                    </button>
                    <button
                      onClick={() => handlePreview(t)}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                    >
                      <Eye size={12} /> Xem
                    </button>
                    <button
                      onClick={() => handleDuplicate(t)}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2.5 text-xs text-gray-400 hover:text-white hover:bg-[#252525] transition-colors"
                    >
                      <Copy size={12} /> Sao chep
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="flex items-center justify-center gap-1.5 flex-1 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                    >
                      <Trash2 size={12} /> Xoa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {filtered.length > 0 && (
          <p className="text-xs text-gray-500">
            Hien thi <span className="text-white font-semibold">{filtered.length}</span> template
            {category !== "all" && (
              <> trong danh muc <span className="text-white font-semibold">{CATEGORIES.find(c => c.value === category)?.label}</span></>
            )}
          </p>
        )}
      </div>

      {/* Editor modal */}
      <TemplateEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        initial={editingTemplate}
      />

      {/* Preview modal */}
      <TemplatePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={previewHtml}
        subject={previewSubject}
      />
    </div>
  );
}
