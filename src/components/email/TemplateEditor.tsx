"use client";

import { useState, useRef, useCallback } from "react";
import { X, Save, Eye, FileText, Layout, Loader2, Code } from "lucide-react";
import TemplatePreviewModal from "./TemplatePreviewModal";
import RichTextEditor from "./RichTextEditor";

interface TemplateEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: TemplateData) => Promise<void>;
  initial?: Partial<TemplateData>;
}

export interface TemplateData {
  id?: string;
  name: string;
  subject: string;
  category: string;
  html_content: string;
  text_content: string;
}

const CATEGORIES = [
  { value: "marketing", label: "Marketing" },
  { value: "newsletter", label: "Newsletter" },
  { value: "transactional", label: "Transactional" },
  { value: "other", label: "Khac" },
];

const VARIABLES = [
  { label: "{{name}}", desc: "Ten nguoi nhan" },
  { label: "{{email}}", desc: "Email nguoi nhan" },
  { label: "{{unsubscribe_url}}", desc: "Link huy dang ky" },
  { label: "{{company}}", desc: "Ten cong ty" },
  { label: "{{date}}", desc: "Ngay hien tai" },
];

export default function TemplateEditor({ open, onClose, onSave, initial }: TemplateEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [category, setCategory] = useState(initial?.category ?? "marketing");
  const [htmlContent, setHtmlContent] = useState(initial?.html_content ?? "");
  const [textContent, setTextContent] = useState(initial?.text_content ?? "");
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"wysiwyg" | "html">("wysiwyg");
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = useCallback((variable: string) => {
    if (editorMode === "html") {
      const ta = htmlRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = htmlContent.substring(0, start);
      const after = htmlContent.substring(end);
      const newContent = before + variable + after;
      setHtmlContent(newContent);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + variable.length;
        ta.setSelectionRange(pos, pos);
      });
    } else {
      // For WYSIWYG, append the variable to the content
      setHtmlContent((prev) => prev + variable);
    }
  }, [htmlContent, editorMode]);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: initial?.id,
        name: name.trim(),
        subject: subject.trim(),
        category,
        html_content: htmlContent,
        text_content: textContent,
      });
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      >
        <div
          className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl overflow-hidden"
          style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2">
              <Layout size={16} className="text-[#D4A843]" />
              <h3 className="text-white font-semibold text-sm">
                {initial?.id ? "Chinh sua template" : "Tao template moi"}
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          </div>

          {/* Body - split view */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Left: Form */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Ten template *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Welcome Email"
                  className="input-dark w-full text-sm"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject line *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="VD: Chao mung ban den voi Dang Khuong Academy!"
                  className="input-dark w-full text-sm"
                />
                <p className="text-[11px] text-gray-600 mt-1">{subject.length} ky tu</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Danh muc</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-dark w-full text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Variables */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Bien co san</label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => insertVariable(v.label)}
                      className="px-2 py-1 rounded text-xs font-mono transition-colors"
                      style={{ background: "#252525", color: "#D4A843", border: "1px solid #333" }}
                      title={v.desc}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor mode toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-400">Noi dung HTML</label>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
                    <button
                      type="button"
                      onClick={() => setEditorMode("wysiwyg")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors"
                      style={{
                        background: editorMode === "wysiwyg" ? "rgba(212,168,67,0.15)" : "#1f1f1f",
                        color: editorMode === "wysiwyg" ? "#D4A843" : "#9ca3af",
                      }}
                    >
                      <Layout size={11} />
                      WYSIWYG
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode("html")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-colors"
                      style={{
                        background: editorMode === "html" ? "rgba(212,168,67,0.15)" : "#1f1f1f",
                        color: editorMode === "html" ? "#D4A843" : "#9ca3af",
                      }}
                    >
                      <Code size={11} />
                      HTML
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="flex items-center gap-1 text-xs text-[#D4A843] hover:underline"
                  >
                    <Eye size={12} /> Xem truoc
                  </button>
                </div>
              </div>

              {/* WYSIWYG Editor */}
              {editorMode === "wysiwyg" && (
                <RichTextEditor
                  value={htmlContent}
                  onChange={setHtmlContent}
                  placeholder="Nhap noi dung email..."
                  minHeight={280}
                />
              )}

              {/* Raw HTML Editor */}
              {editorMode === "html" && (
                <textarea
                  ref={htmlRef}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<html>...</html>"
                  rows={14}
                  className="input-dark w-full text-sm resize-none"
                  style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace" }}
                />
              )}

              <p className="text-[11px] text-gray-600">{htmlContent.length} ky tu</p>

              {/* Text Content */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  <FileText size={12} className="inline mr-1" />
                  Phien ban text (tuy chon)
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Noi dung plain text..."
                  rows={4}
                  className="input-dark w-full text-sm resize-none"
                />
              </div>
            </div>

            {/* Right: Live preview (desktop only) */}
            <div className="hidden lg:flex flex-col w-[420px] border-l border-[#2a2a2a]">
              <div className="px-4 py-2.5 border-b border-[#2a2a2a] flex items-center gap-2">
                <Eye size={13} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-400">Xem truoc truc tiep</span>
              </div>
              <div className="flex-1 overflow-auto p-3" style={{ background: "#111" }}>
                <div className="rounded-lg overflow-hidden" style={{ background: "white" }}>
                  <iframe
                    srcDoc={htmlContent || "<p style='padding:40px;color:#999;text-align:center;font-family:sans-serif;'>Nhap HTML de xem truoc...</p>"}
                    title="Live preview"
                    sandbox="allow-same-origin"
                    style={{ width: "100%", minHeight: 400, border: "none", display: "block" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#2a2a2a]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              style={{ border: "1px solid #2a2a2a" }}
            >
              Huy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !subject.trim()}
              className="btn-green flex items-center gap-2 text-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Dang luu..." : "Luu template"}
            </button>
          </div>
        </div>
      </div>

      <TemplatePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={htmlContent}
        subject={subject}
      />
    </>
  );
}
