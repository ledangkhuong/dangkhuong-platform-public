"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import TemplatePreviewModal from "@/components/email/TemplatePreviewModal";
import {
  Mail, Send, Clock, ChevronRight, ChevronLeft, Check, X, Loader2,
  Eye, FileText, Layout, Users, Sparkles, BarChart3, Play, Edit,
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

interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to: string;
  list_id: string;
  html_content: string;
  text_content: string;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  total_recipients: number;
  sent_at: string | null;
  scheduled_at: string | null;
  created_at: string;
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Nhap", color: "#6b7280" },
  scheduled: { label: "Da len lich", color: "#3b82f6" },
  sending: { label: "Dang gui", color: "#f59e0b" },
  sent: { label: "Da gui", color: "#D4A843" },
  paused: { label: "Tam dung", color: "#f97316" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Step
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Fields
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("Dang Khuong Academy");
  const [fromEmail] = useState("support@ledangkhuong.net");
  const [replyTo, setReplyTo] = useState("");
  const [listId, setListId] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [textContent, setTextContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  // Data
  const [lists, setLists] = useState<EmailList[]>([]);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  // Content mode
  const [contentMode, setContentMode] = useState<"template" | "custom">("custom");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  // Test email
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sendingNow, setSendingNow] = useState(false);

  // Fetch campaign
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/email/campaigns/${campaignId}`);
        if (res.ok) {
          const data = await res.json();
          const c = data.campaign ?? data;
          setCampaign(c);
          setName(c.name ?? "");
          setSubject(c.subject ?? "");
          setFromName(c.from_name ?? "Dang Khuong Academy");
          setReplyTo(c.reply_to ?? "");
          setListId(c.list_id ?? "");
          setHtmlContent(c.html_content ?? "");
          setTextContent(c.text_content ?? "");
          setScheduledAt(c.scheduled_at ?? "");
          setIsReadOnly(c.status === "sent" || c.status === "sending");
        }
      } catch { /* */ } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId]);

  // Fetch lists
  useEffect(() => {
    fetch("/api/email/lists")
      .then((r) => r.json())
      .then((data) => setLists(data.lists ?? data ?? []))
      .catch(() => {});
  }, []);

  // Fetch templates
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

  // Subscriber count
  useEffect(() => {
    if (listId === "" || listId === "all") {
      const total = lists.reduce((sum, l) => sum + (l.subscriber_count ?? 0), 0);
      setSubscriberCount(total || null);
    } else {
      const found = lists.find((l) => l.id === listId);
      setSubscriberCount(found?.subscriber_count ?? null);
    }
  }, [listId, lists]);

  // Insert variable
  const insertVariable = useCallback((variable: string) => {
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
  }, [htmlContent]);

  // Save draft
  const saveDraft = useCallback(async () => {
    if (isReadOnly) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const body = {
        name, subject, from_name: fromName, from_email: fromEmail,
        reply_to: replyTo || undefined,
        list_id: listId || undefined,
        html_content: htmlContent,
        text_content: textContent || undefined,
        scheduled_at: scheduledAt || undefined,
      };
      const res = await fetch(`/api/email/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaveMsg("Da luu!");
        setTimeout(() => setSaveMsg(""), 2000);
      } else {
        setSaveMsg("Loi khi luu");
      }
    } catch {
      setSaveMsg("Loi ket noi");
    } finally {
      setSaving(false);
    }
  }, [name, subject, fromName, fromEmail, replyTo, listId, htmlContent, textContent, scheduledAt, campaignId, isReadOnly]);

  const goToStep = async (newStep: number) => {
    if (newStep > step && !isReadOnly) await saveDraft();
    setStep(newStep);
  };

  // Send test
  const sendTest = async () => {
    if (!testEmail) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/email/campaigns/${campaignId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_email: testEmail }),
      });
      setTestResult(res.ok
        ? { ok: true, msg: "Da gui email test thanh cong!" }
        : { ok: false, msg: "Gui that bai." });
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
      await saveDraft();
      const res = await fetch(`/api/email/campaigns/${campaignId}/send`, { method: "POST" });
      if (res.ok) router.push(`/email/campaigns/${campaignId}/sending`);
    } catch { /* */ } finally {
      setSendingNow(false);
    }
  };

  const selectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl.id);
    setHtmlContent(tpl.html_content);
    if (!subject) setSubject(tpl.subject);
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Dang tai..." />
        <div className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-[#D4A843]" />
        </div>
      </div>
    );
  }

  // Read-only view for sent/sending campaigns
  if (isReadOnly && campaign) {
    const st = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
    const openRate = campaign.sent_count > 0 ? ((campaign.open_count / campaign.sent_count) * 100).toFixed(1) : "0.0";
    const clickRate = campaign.sent_count > 0 ? ((campaign.click_count / campaign.sent_count) * 100).toFixed(1) : "0.0";

    return (
      <div>
        <TopBar title={campaign.name || campaign.subject} subtitle="Chi tiet campaign" />
        <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: st.color + "18", color: st.color }}
            >
              {campaign.status === "sending" && (
                <span className="w-2 h-2 rounded-full mr-2 animate-pulse" style={{ background: st.color }} />
              )}
              {st.label}
            </span>
            {campaign.status === "sending" && (
              <button
                onClick={() => router.push(`/email/campaigns/${campaignId}/sending`)}
                className="flex items-center gap-1.5 text-xs text-[#f59e0b] hover:underline"
              >
                <Play size={12} /> Xem tien do
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card text-center">
              <div className="text-2xl font-bold text-white">{campaign.sent_count?.toLocaleString("vi-VN") ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">Da gui</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-2xl font-bold" style={{ color: "#D4A843" }}>{openRate}%</div>
              <div className="text-xs text-gray-500 mt-1">Open rate</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-2xl font-bold" style={{ color: "#3b82f6" }}>{clickRate}%</div>
              <div className="text-xs text-gray-500 mt-1">Click rate</div>
            </div>
            <div className="stat-card text-center">
              <div className="text-2xl font-bold text-white">{campaign.total_recipients?.toLocaleString("vi-VN") ?? 0}</div>
              <div className="text-xs text-gray-500 mt-1">Tong nguoi nhan</div>
            </div>
          </div>

          {/* Details */}
          <div className="card-dark p-6 space-y-4">
            <h2 className="text-white font-semibold text-base">Chi tiet</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Subject</p>
                <p className="text-white">{campaign.subject}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Nguoi gui</p>
                <p className="text-white">{campaign.from_name} &lt;{campaign.from_email}&gt;</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Gui luc</p>
                <p className="text-white">{formatDate(campaign.sent_at)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Tao luc</p>
                <p className="text-white">{formatDate(campaign.created_at)}</p>
              </div>
            </div>

            {campaign.html_content && (
              <button
                onClick={() => setPreviewOpen(true)}
                className="flex items-center gap-1.5 text-xs text-[#D4A843] hover:underline"
              >
                <Eye size={12} /> Xem noi dung email
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/email/campaigns")}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              style={{ border: "1px solid #2a2a2a" }}
            >
              Quay lai
            </button>
            {campaign.status === "sent" && (
              <button
                onClick={() => router.push(`/email/campaigns/${campaignId}/analytics`)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(212,168,67,0.12)", color: "#D4A843", border: "1px solid rgba(212,168,67,0.3)" }}
              >
                <BarChart3 size={14} /> Xem analytics
              </button>
            )}
          </div>
        </div>

        <TemplatePreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          html={campaign.html_content ?? ""}
          subject={campaign.subject}
        />
      </div>
    );
  }

  // Editable view (same structure as new page)
  const canProceed = (s: number) => {
    if (s === 0) return name.trim() !== "" && subject.trim() !== "";
    if (s === 2) return htmlContent.trim() !== "";
    return true;
  };

  return (
    <div>
      <TopBar title="Chinh sua campaign" subtitle={name || "Campaign"} />

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <button onClick={() => { if (i <= step) setStep(i); }} className="flex items-center gap-2">
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
                <div className="flex-1 h-px mx-3" style={{ background: i < step ? "#D4A843" : "#2a2a2a" }} />
              )}
            </div>
          ))}
        </div>

        {saveMsg && (
          <div className="flex items-center gap-2 text-xs" style={{ color: saveMsg.includes("Loi") ? "#ef4444" : "#D4A843" }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {saveMsg}
          </div>
        )}

        {/* Step 1 */}
        {step === 0 && (
          <div className="card-dark p-6 space-y-5">
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <FileText size={18} className="text-[#D4A843]" /> Thong tin co ban
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Ten campaign *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-dark w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject line *</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="input-dark w-full text-sm" />
              <p className="text-[11px] text-gray-600 mt-1">{subject.length} ky tu</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Ten nguoi gui</label>
                <input type="text" value={fromName} onChange={(e) => setFromName(e.target.value)} className="input-dark w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Email nguoi gui</label>
                <input type="email" value={fromEmail} disabled className="input-dark w-full text-sm opacity-60 cursor-not-allowed" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Reply-to email (tuy chon)</label>
              <input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="input-dark w-full text-sm" />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <div className="card-dark p-6 space-y-5">
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              <Users size={18} className="text-[#D4A843]" /> Nguoi nhan
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Chon danh sach</label>
              <select value={listId} onChange={(e) => setListId(e.target.value)} className="input-dark w-full text-sm">
                <option value="">Tat ca subscribers</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.subscriber_count ?? 0} nguoi)</option>
                ))}
              </select>
            </div>
            {subscriberCount !== null && (
              <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)" }}>
                <Users size={18} className="text-[#D4A843]" />
                <div>
                  <p className="text-white text-sm font-medium">{subscriberCount.toLocaleString("vi-VN")} nguoi nhan</p>
                  <p className="text-xs text-gray-500">{listId ? "Trong danh sach da chon" : "Tat ca subscribers"}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <div className="space-y-4">
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

            {contentMode === "template" && (
              <div className="card-dark p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Chon template</h3>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
                ) : templates.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">Chua co template nao</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates.map((tpl) => {
                      const cat = CATEGORY_LABELS[tpl.category] ?? CATEGORY_LABELS.other;
                      return (
                        <div key={tpl.id} onClick={() => selectTemplate(tpl)} className="rounded-lg p-4 cursor-pointer transition-all"
                          style={{ background: selectedTemplate === tpl.id ? "rgba(212,168,67,0.08)" : "#252525", border: selectedTemplate === tpl.id ? "2px solid #D4A843" : "2px solid #333" }}>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-white text-sm font-medium truncate flex-1">{tpl.name}</h4>
                            {selectedTemplate === tpl.id && <Check size={14} className="text-[#D4A843] shrink-0 ml-2" />}
                          </div>
                          <p className="text-xs text-gray-500 truncate mb-2">{tpl.subject}</p>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cat.color + "18", color: cat.color }}>{cat.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="card-dark p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Noi dung HTML</h3>
                <button onClick={() => setPreviewOpen(true)} disabled={!htmlContent}
                  className="flex items-center gap-1.5 text-xs text-[#D4A843] hover:underline disabled:opacity-40">
                  <Eye size={12} /> Xem truoc
                </button>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1.5">Chen bien:</label>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <button key={v.label} type="button" onClick={() => insertVariable(v.label)}
                      className="px-2 py-1 rounded text-xs font-mono transition-colors hover:bg-[#333]"
                      style={{ background: "#252525", color: "#D4A843", border: "1px solid #333" }} title={v.desc}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea ref={htmlRef} value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)}
                rows={16} className="input-dark w-full text-sm resize-none"
                style={{ fontFamily: "'Fira Code', 'Cascadia Code', monospace", lineHeight: 1.6 }} />
              <p className="text-[11px] text-gray-600">{htmlContent.length} ky tu</p>
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 flex items-center gap-1.5">
                  <FileText size={12} /> Phien ban plain text (tuy chon)
                </summary>
                <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)}
                  rows={6} className="input-dark w-full text-sm resize-none mt-3" />
              </details>
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="card-dark p-6 space-y-4">
              <h2 className="text-white font-semibold text-base flex items-center gap-2">
                <Send size={18} className="text-[#D4A843]" /> Xem lai campaign
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-[11px] text-gray-500 mb-0.5">Ten campaign</p><p className="text-white text-sm">{name || "--"}</p></div>
                <div><p className="text-[11px] text-gray-500 mb-0.5">Subject line</p><p className="text-white text-sm">{subject || "--"}</p></div>
                <div><p className="text-[11px] text-gray-500 mb-0.5">Nguoi gui</p><p className="text-white text-sm">{fromName} &lt;{fromEmail}&gt;</p></div>
                <div><p className="text-[11px] text-gray-500 mb-0.5">Nguoi nhan</p>
                  <p className="text-white text-sm">{listId ? lists.find((l) => l.id === listId)?.name : "Tat ca subscribers"}
                    {subscriberCount !== null && <span className="text-gray-500 ml-1">({subscriberCount.toLocaleString("vi-VN")})</span>}
                  </p>
                </div>
              </div>
              {htmlContent && (
                <button onClick={() => setPreviewOpen(true)} className="flex items-center gap-1.5 text-xs text-[#D4A843] hover:underline">
                  <Eye size={12} /> Xem truoc email
                </button>
              )}
            </div>

            {/* Test email */}
            <div className="card-dark p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Mail size={15} className="text-[#3b82f6]" /> Gui email test
              </h3>
              <div className="flex gap-2">
                <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com" className="input-dark flex-1 text-sm" />
                <button onClick={sendTest} disabled={testSending || !testEmail}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>
                  {testSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Gui test
                </button>
              </div>
              {testResult && <p className="text-xs" style={{ color: testResult.ok ? "#D4A843" : "#ef4444" }}>{testResult.msg}</p>}
            </div>

            {/* Schedule */}
            <div className="card-dark p-5 space-y-4">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Clock size={15} className="text-[#f59e0b]" /> Len lich gui
              </h3>
              <div className="flex items-center gap-3">
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input-dark text-sm flex-1" />
                {scheduledAt && <button onClick={() => setScheduledAt("")} className="text-gray-500 hover:text-white"><X size={16} /></button>}
              </div>
            </div>

            {/* Send */}
            <div className="flex items-center justify-between gap-4">
              {scheduledAt && (
                <button onClick={async () => { await saveDraft(); router.push("/email/campaigns"); }}
                  className="px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
                  style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}>
                  <Clock size={15} /> Len lich gui
                </button>
              )}
              <button onClick={sendNow} disabled={sendingNow || !htmlContent.trim()}
                className="btn-green flex items-center gap-2 text-sm px-8 py-3 ml-auto">
                {sendingNow ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sendingNow ? "Dang xu ly..." : "Gui ngay"}
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => goToStep(Math.max(0, step - 1))} disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            style={{ border: "1px solid #2a2a2a" }}>
            <ChevronLeft size={15} /> Quay lai
          </button>
          {step < STEPS.length - 1 && (
            <button onClick={() => goToStep(step + 1)} disabled={!canProceed(step)}
              className="btn-green flex items-center gap-2 text-sm">
              Tiep theo <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>

      <TemplatePreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} html={htmlContent} subject={subject} />
    </div>
  );
}
