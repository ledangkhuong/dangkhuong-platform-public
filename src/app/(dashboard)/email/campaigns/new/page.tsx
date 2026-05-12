"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import TemplatePreviewModal from "@/components/email/TemplatePreviewModal";
import TestEmailModal from "@/components/email/TestEmailModal";
import RichTextEditor from "@/components/email/RichTextEditor";
import {
  Mail, Send, Clock, ChevronRight, ChevronLeft, Check, X, Loader2,
  Eye, FileText, Layout, Users, Plus, Sparkles, FlaskConical, Code,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmailList {
  id: string;
  name: string;
  subscriber_count: number;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
  html_content: string;
}

interface CampaignDraft {
  id?: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  list_id: string;
  html_content: string;
  text_content: string;
  scheduled_at: string;
}

const STEPS = [
  { key: "info", label: "Thong tin co ban", icon: FileText },
  { key: "recipients", label: "Nguoi nhan", icon: Users },
  { key: "content", label: "Noi dung email", icon: Layout },
  { key: "review", label: "Xem lai & Gui", icon: Send },
];

const VARIABLES = [
  { label: "{{name}}", desc: "Ten nguoi nhan" },
  { label: "{{email}}", desc: "Email nguoi nhan" },
  { label: "{{unsubscribe_url}}", desc: "Link huy dang ky" },
  { label: "{{company}}", desc: "Ten cong ty" },
  { label: "{{date}}", desc: "Ngay hien tai" },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  marketing: { label: "Marketing", color: "#D4A843" },
  newsletter: { label: "Newsletter", color: "#3b82f6" },
  transactional: { label: "Transactional", color: "#f59e0b" },
  other: { label: "Khac", color: "#6b7280" },
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router = useRouter();
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  // Step
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Step 1 - Basic info
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("Dang Khuong Academy");
  const [fromEmail] = useState("support@ledangkhuong.net");
  const [replyTo, setReplyTo] = useState("");

  // Step 2 - Recipients
  const [lists, setLists] = useState<EmailList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listId, setListId] = useState("");
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  // Step 3 - Content
  const [contentMode, setContentMode] = useState<"template" | "custom">("custom");
  const [editorMode, setEditorMode] = useState<"wysiwyg" | "html">("wysiwyg");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [textContent, setTextContent] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templatePreviewHtml, setTemplatePreviewHtml] = useState("");
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);

  // Step 4 - Send
  const [scheduledAt, setScheduledAt] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sendingNow, setSendingNow] = useState(false);

  // Test email modal
  const [testModalOpen, setTestModalOpen] = useState(false);

  // Campaign ID (generated on first save)
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Fetch lists
  useEffect(() => {
    setListsLoading(true);
    fetch("/api/email/lists")
      .then((r) => r.json())
      .then((data) => setLists(data.lists ?? data ?? []))
      .catch(() => {})
      .finally(() => setListsLoading(false));
  }, []);

  // Fetch templates when selecting template mode
  useEffect(() => {
    if (contentMode === "template" && templates.length === 0) {
      setTemplatesLoading(true);
      fetch("/api/email/templates")
        .then((r) => r.json())
        .then((data) => setTemplates(data.templates ?? data ?? []))
        .catch(() => {})
        .finally(() => setTemplatesLoading(false));
    }
  }, [contentMode, templates.length]);

  // Update subscriber count when list changes
  useEffect(() => {
    if (listId === "" || listId === "all") {
      const total = lists.reduce((sum, l) => sum + (l.subscriber_count ?? 0), 0);
      setSubscriberCount(total || null);
    } else {
      const found = lists.find((l) => l.id === listId);
      setSubscriberCount(found?.subscriber_count ?? null);
    }
  }, [listId, lists]);

  // Insert variable (for raw HTML mode)
  const insertVariable = useCallback((variable: string) => {
    if (editorMode === "html") {
      const ta = htmlRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = htmlContent.substring(0, start);
      const after = htmlContent.substring(end);
      setHtmlContent(before + variable + after);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + variable.length;
        ta.setSelectionRange(pos, pos);
      });
    } else {
      // For WYSIWYG mode, append the variable to the HTML content
      setHtmlContent((prev) => prev + variable);
    }
  }, [htmlContent, editorMode]);

  // Save draft — returns the campaign ID on success, or null on failure
  const saveDraft = useCallback(async (): Promise<string | null> => {
    setSaving(true);
    setSaveMsg("");
    try {
      const body: Record<string, unknown> = {
        name, subject, from_name: fromName, from_email: fromEmail,
        reply_to: replyTo || undefined,
        list_id: listId || undefined,
        html_content: htmlContent,
        text_content: textContent || undefined,
        scheduled_at: scheduledAt || undefined,
      };

      // Timeout after 10s to prevent page freezing
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      let res: Response;
      if (campaignId) {
        res = await fetch(`/api/email/campaigns/${campaignId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } else {
        res = await fetch("/api/email/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      }
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const id = data.id || data.campaign?.id;
        if (!campaignId && id) setCampaignId(id);
        setSaveMsg("Da luu!");
        setTimeout(() => setSaveMsg(""), 2000);
        return id || campaignId || null;
      } else {
        setSaveMsg("Loi khi luu");
        setTimeout(() => setSaveMsg(""), 3000);
        return campaignId || null;
      }
    } catch {
      setSaveMsg("Loi ket noi");
      return campaignId || null;
    } finally {
      setSaving(false);
    }
  }, [name, subject, fromName, fromEmail, replyTo, listId, htmlContent, textContent, scheduledAt, campaignId]);

  // Step change — save in background (don't block navigation)
  const goToStep = (newStep: number) => {
    if (newStep > step && name.trim() && subject.trim()) {
      saveDraft(); // fire-and-forget — don't await
    }
    setStep(newStep);
  };

  // Send test email (inline in step 4)
  const sendTest = async () => {
    if (!testEmail || !campaignId) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/email/campaigns/${campaignId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_email: testEmail }),
      });
      if (res.ok) {
        setTestResult({ ok: true, msg: "Da gui email test thanh cong!" });
      } else {
        setTestResult({ ok: false, msg: "Gui that bai. Vui long thu lai." });
      }
    } catch {
      setTestResult({ ok: false, msg: "Loi ket noi" });
    } finally {
      setTestSending(false);
    }
  };

  // Send now
  const sendNow = async () => {
    setSendingNow(true);
    try {
      // Save final version first — use returned id (React state may be stale)
      const savedId = await saveDraft();
      const id = savedId || campaignId;
      if (!id) {
        setSendingNow(false);
        return;
      }

      const res = await fetch(`/api/email/campaigns/${id}/send`, {
        method: "POST",
      });
      if (res.ok) {
        router.push(`/email/campaigns/${id}/sending`);
      }
    } catch { /* */ } finally {
      setSendingNow(false);
    }
  };

  // Template preview
  const previewTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/email/templates/${templateId}/preview`);
      if (res.ok) {
        const data = await res.json();
        setTemplatePreviewHtml(data.html ?? data.html_content ?? "");
        setTemplatePreviewOpen(true);
      }
    } catch { /* */ }
  };

  // Select template
  const selectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl.id);
    setHtmlContent(tpl.html_content);
    if (!subject) setSubject(tpl.subject);
  };

  // Can proceed check
  const canProceed = (s: number) => {
    if (s === 0) return name.trim() !== "" && subject.trim() !== "";
    if (s === 1) return true;
    if (s === 2) return htmlContent.trim() !== "";
    return true;
  };

  return (
    <div>
      <TopBar title="Tao campaign moi" />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <button
                onClick={() => { if (i <= step) setStep(i); }}
                className="flex items-center gap-2"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0"
                  style={{
                    background: i < step ? "#D4A843" : i === step ? "rgba(212,168,67,0.15)" : "#252525",
                    color: i < step ? "white" : i === step ? "#D4A843" : "#6b7280",
                    border: i === step ? "2px solid #D4A843" : "2px solid transparent",
                  }}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className="text-xs font-medium hidden sm:inline whitespace-nowrap"
                  style={{ color: i <= step ? "white" : "#6b7280" }}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-3"
                  style={{ background: i < step ? "#D4A843" : "#2a2a2a" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Save indicator */}
        {saveMsg && (
          <div className="flex items-center gap-2 text-xs" style={{ color: saveMsg.includes("Loi") ? "#ef4444" : "#D4A843" }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {saveMsg}
          </div>
        )}

        {/* ──────────── Step 1: Basic Info ──────────── */}
        {step === 0 && (
          <div className="card-dark p-6 space-y-5">
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <FileText size={18} className="text-[#D4A843]" />
              Thong tin co ban
            </h2>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Ten campaign *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Welcome Series - Thang 6"
                className="input-dark w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject line *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Chao mung ban den voi Dang Khuong Academy!"
                className="input-dark w-full text-sm"
              />
              <p className="text-[11px] text-gray-600 mt-1">
                {subject.length} ky tu
                {subject.length > 50 && (
                  <span className="text-[#f59e0b] ml-2">Nen giu duoi 50 ky tu</span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Ten nguoi gui</label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="input-dark w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email nguoi gui</label>
                <input
                  type="email"
                  value={fromEmail}
                  disabled
                  className="input-dark w-full text-sm opacity-60 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Reply-to email (tuy chon)</label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="VD: support@ledangkhuong.net"
                className="input-dark w-full text-sm"
              />
            </div>
          </div>
        )}

        {/* ──────────── Step 2: Recipients ──────────── */}
        {step === 1 && (
          <div className="card-dark p-6 space-y-5">
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <Users size={18} className="text-[#D4A843]" />
              Nguoi nhan
            </h2>

            {listsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-500" />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Chon danh sach</label>
                  <select
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
                    className="input-dark w-full text-sm"
                  >
                    <option value="">Tat ca subscribers</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.subscriber_count ?? 0} nguoi)
                      </option>
                    ))}
                  </select>
                </div>

                {subscriberCount !== null && (
                  <div
                    className="flex items-center gap-3 p-4 rounded-lg"
                    style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)" }}
                  >
                    <Users size={18} className="text-[#D4A843]" />
                    <div>
                      <p className="text-white text-sm font-medium">
                        {subscriberCount.toLocaleString("vi-VN")} nguoi nhan
                      </p>
                      <p className="text-xs text-gray-500">
                        {listId ? "Trong danh sach da chon" : "Tat ca subscribers dang hoat dong"}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ──────────── Step 3: Content ──────────── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setContentMode("template")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: contentMode === "template" ? "rgba(212,168,67,0.12)" : "#1f1f1f",
                  color: contentMode === "template" ? "#D4A843" : "#9ca3af",
                  border: contentMode === "template" ? "1px solid rgba(212,168,67,0.3)" : "1px solid #2a2a2a",
                }}
              >
                <Layout size={15} /> Chon template
              </button>
              <button
                onClick={() => setContentMode("custom")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: contentMode === "custom" ? "rgba(212,168,67,0.12)" : "#1f1f1f",
                  color: contentMode === "custom" ? "#D4A843" : "#9ca3af",
                  border: contentMode === "custom" ? "1px solid rgba(212,168,67,0.3)" : "1px solid #2a2a2a",
                }}
              >
                <Sparkles size={15} /> Viet moi
              </button>
            </div>

            {/* Template gallery */}
            {contentMode === "template" && (
              <div className="card-dark p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Chon template</h3>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-gray-500" />
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">Chua co template nao</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((tpl) => {
                      const cat = CATEGORY_LABELS[tpl.category] ?? CATEGORY_LABELS.other;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => selectTemplate(tpl)}
                          className="rounded-lg p-4 cursor-pointer transition-all"
                          style={{
                            background: selectedTemplate === tpl.id ? "rgba(212,168,67,0.08)" : "#252525",
                            border: selectedTemplate === tpl.id ? "2px solid #D4A843" : "2px solid #333",
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-white text-sm font-medium truncate flex-1">{tpl.name}</h4>
                            {selectedTemplate === tpl.id && (
                              <Check size={14} className="text-[#D4A843] shrink-0 ml-2" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mb-2">{tpl.subject}</p>
                          <div className="flex items-center justify-between">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: cat.color + "18", color: cat.color }}
                            >
                              {cat.label}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); previewTemplate(tpl.id); }}
                              className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <Eye size={11} /> Xem
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Content Editor */}
            <div className="card-dark p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Noi dung email</h3>
                <div className="flex items-center gap-2">
                  {/* Editor mode toggle */}
                  <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
                    <button
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
                    onClick={() => setPreviewOpen(true)}
                    disabled={!htmlContent}
                    className="flex items-center gap-1.5 text-xs text-[#D4A843] hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    <Eye size={12} /> Xem truoc
                  </button>
                </div>
              </div>

              {/* Variables */}
              <div>
                <label className="block text-[11px] text-gray-500 mb-1.5">Chen bien:</label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => insertVariable(v.label)}
                      className="px-2 py-1 rounded text-xs font-mono transition-colors hover:bg-[#333]"
                      style={{ background: "#252525", color: "#D4A843", border: "1px solid #333" }}
                      title={v.desc}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* WYSIWYG Editor */}
              {editorMode === "wysiwyg" && (
                <RichTextEditor
                  value={htmlContent}
                  onChange={setHtmlContent}
                  placeholder="Nhap noi dung email..."
                  minHeight={350}
                />
              )}

              {/* Raw HTML Editor */}
              {editorMode === "html" && (
                <>
                  <textarea
                    ref={htmlRef}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="Nhap noi dung HTML email..."
                    rows={16}
                    className="input-dark w-full text-sm resize-none"
                    style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace", lineHeight: 1.6 }}
                  />
                </>
              )}

              <p className="text-[11px] text-gray-600">{htmlContent.length} ky tu</p>

              {/* Plain text */}
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors flex items-center gap-1.5">
                  <FileText size={12} />
                  Phien ban plain text (tuy chon)
                </summary>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Noi dung text thuan..."
                  rows={6}
                  className="input-dark w-full text-sm resize-none mt-3"
                />
              </details>
            </div>

            {/* Send Test Email button (available during content editing) */}
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  // Auto-save before opening test modal
                  if (name.trim() && subject.trim()) {
                    await saveDraft();
                  }
                  setTestModalOpen(true);
                }}
                disabled={!htmlContent.trim() || !name.trim() || !subject.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(59,130,246,0.12)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59,130,246,0.3)",
                }}
              >
                <FlaskConical size={15} />
                Gui Email Test
              </button>
            </div>
          </div>
        )}

        {/* ──────────── Step 4: Review & Send ──────────── */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="card-dark p-6 space-y-4">
              <h2 className="text-white font-semibold text-base flex items-center gap-2">
                <Send size={18} className="text-[#D4A843]" />
                Xem lai campaign
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Ten campaign</p>
                  <p className="text-white text-sm">{name || "--"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Subject line</p>
                  <p className="text-white text-sm">{subject || "--"}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Nguoi gui</p>
                  <p className="text-white text-sm">{fromName} &lt;{fromEmail}&gt;</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Reply-to</p>
                  <p className="text-white text-sm">{replyTo || fromEmail}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Nguoi nhan</p>
                  <p className="text-white text-sm">
                    {listId ? lists.find((l) => l.id === listId)?.name : "Tat ca subscribers"}
                    {subscriberCount !== null && (
                      <span className="text-gray-500 ml-1">({subscriberCount.toLocaleString("vi-VN")} nguoi)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-0.5">Noi dung</p>
                  <p className="text-white text-sm">{htmlContent.length} ky tu HTML</p>
                </div>
              </div>

              {htmlContent && (
                <button
                  onClick={() => setPreviewOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-[#D4A843] hover:underline"
                >
                  <Eye size={12} /> Xem truoc email
                </button>
              )}
            </div>

            {/* Test email */}
            <div className="card-dark p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Mail size={15} className="text-[#3b82f6]" />
                Gui email test
              </h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-dark flex-1 text-sm"
                />
                <button
                  onClick={sendTest}
                  disabled={testSending || !testEmail || !campaignId}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}
                >
                  {testSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Gui test
                </button>
              </div>
              {/* Quick test modal button */}
              <button
                onClick={() => setTestModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#3b82f6] transition-colors"
              >
                <FlaskConical size={12} />
                Mo cua so gui test
              </button>
              {!campaignId && (
                <p className="text-xs text-[#f59e0b]">Luu campaign truoc khi gui test.</p>
              )}
              {testResult && (
                <p className="text-xs" style={{ color: testResult.ok ? "#D4A843" : "#ef4444" }}>
                  {testResult.msg}
                </p>
              )}
            </div>

            {/* Schedule or send */}
            <div className="card-dark p-5 space-y-4">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Clock size={15} className="text-[#f59e0b]" />
                Len lich gui
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="input-dark text-sm flex-1"
                />
                {scheduledAt && (
                  <button
                    onClick={() => setScheduledAt("")}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {scheduledAt && (
                <p className="text-xs text-gray-500">
                  Campaign se duoc gui vao {new Date(scheduledAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                </p>
              )}
            </div>

            {/* Send now button */}
            <div className="flex items-center justify-between gap-4">
              {scheduledAt && (
                <button
                  onClick={async () => {
                    await saveDraft();
                    router.push("/email/campaigns");
                  }}
                  className="px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}
                >
                  <Clock size={15} /> Len lich gui
                </button>
              )}
              <button
                onClick={sendNow}
                disabled={sendingNow || !htmlContent.trim()}
                className="btn-green flex items-center gap-2 text-sm px-8 py-3 ml-auto"
              >
                {sendingNow ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sendingNow ? "Dang xu ly..." : "Gui ngay"}
              </button>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => goToStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            style={{ border: "1px solid #2a2a2a" }}
          >
            <ChevronLeft size={15} /> Quay lai
          </button>

          {step < STEPS.length - 1 && (
            <button
              onClick={() => goToStep(step + 1)}
              disabled={!canProceed(step)}
              className="btn-green flex items-center gap-2 text-sm"
            >
              Tiep theo <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Previews */}
      <TemplatePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        html={htmlContent}
        subject={subject}
      />
      <TemplatePreviewModal
        open={templatePreviewOpen}
        onClose={() => setTemplatePreviewOpen(false)}
        html={templatePreviewHtml}
      />

      {/* Test Email Modal */}
      <TestEmailModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        campaignId={campaignId}
        onSaveDraft={saveDraft}
      />
    </div>
  );
}
