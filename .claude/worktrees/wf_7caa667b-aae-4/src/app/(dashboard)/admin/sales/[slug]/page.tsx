"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import TopBar from "@/components/layout/TopBar";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
} from "lucide-react";

/* ─── Types ─── */

interface PainPoint {
  icon: string;
  title: string;
  description: string;
}

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  role: string;
  text: string;
  avatar?: string;
}

interface FAQ {
  question: string;
  answer: string;
}

interface SalesConfig {
  painPoints: PainPoint[];
  benefits: Benefit[];
  testimonials: Testimonial[];
  faqs: FAQ[];
  guaranteeDays: number;
}

const emptyConfig: SalesConfig = {
  painPoints: [],
  benefits: [],
  testimonials: [],
  faqs: [],
  guaranteeDays: 7,
};

/* ─── Page ─── */

export default function AdminSalesConfigPage() {
  const { slug } = useParams<{ slug: string }>();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productTitle, setProductTitle] = useState("");
  const [productId, setProductId] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [config, setConfig] = useState<SalesConfig>(emptyConfig);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, title, slug, sales_config")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        setNotFoundState(true);
        setLoading(false);
        return;
      }

      setProductId(data.id);
      setProductTitle(data.title);

      if (data.sales_config && typeof data.sales_config === "object") {
        const sc = data.sales_config as Record<string, unknown>;
        setConfig({
          painPoints: Array.isArray(sc.painPoints) ? sc.painPoints as PainPoint[] : [],
          benefits: Array.isArray(sc.benefits) ? sc.benefits as Benefit[] : [],
          testimonials: Array.isArray(sc.testimonials) ? sc.testimonials as Testimonial[] : [],
          faqs: Array.isArray(sc.faqs) ? sc.faqs as FAQ[] : [],
          guaranteeDays: typeof sc.guaranteeDays === "number" ? sc.guaranteeDays : 7,
        });
      }

      setLoading(false);
    }

    if (slug) fetchProduct();
  }, [slug]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    // Clean empty entries
    const payload: SalesConfig = {
      painPoints: config.painPoints.filter((p) => p.title.trim()),
      benefits: config.benefits.filter((b) => b.title.trim()),
      testimonials: config.testimonials.filter((t) => t.name.trim() && t.text.trim()),
      faqs: config.faqs.filter((f) => f.question.trim() && f.answer.trim()),
      guaranteeDays: config.guaranteeDays,
    };

    const { error } = await supabase
      .from("products")
      .update({ sales_config: payload })
      .eq("id", productId);

    if (error) {
      setMessage({ type: "error", text: `Lỗi: ${error.message}` });
    } else {
      setMessage({ type: "success", text: "Cấu hình trang bán hàng đã được lưu!" });
    }

    setSaving(false);
  }, [config, productId, supabase]);

  // ─── Array helpers ────────────────────────────────────────────────────────

  function addPainPoint() {
    setConfig((prev) => ({
      ...prev,
      painPoints: [...prev.painPoints, { icon: "\u{1F614}", title: "", description: "" }],
    }));
  }

  function removePainPoint(idx: number) {
    setConfig((prev) => ({
      ...prev,
      painPoints: prev.painPoints.filter((_, i) => i !== idx),
    }));
  }

  function updatePainPoint(idx: number, field: keyof PainPoint, value: string) {
    setConfig((prev) => ({
      ...prev,
      painPoints: prev.painPoints.map((p, i) =>
        i === idx ? { ...p, [field]: value } : p
      ),
    }));
  }

  function addBenefit() {
    setConfig((prev) => ({
      ...prev,
      benefits: [...prev.benefits, { icon: "\u{2705}", title: "", description: "" }],
    }));
  }

  function removeBenefit(idx: number) {
    setConfig((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== idx),
    }));
  }

  function updateBenefit(idx: number, field: keyof Benefit, value: string) {
    setConfig((prev) => ({
      ...prev,
      benefits: prev.benefits.map((b, i) =>
        i === idx ? { ...b, [field]: value } : b
      ),
    }));
  }

  function addTestimonial() {
    setConfig((prev) => ({
      ...prev,
      testimonials: [
        ...prev.testimonials,
        { name: "", role: "", text: "", avatar: "" },
      ],
    }));
  }

  function removeTestimonial(idx: number) {
    setConfig((prev) => ({
      ...prev,
      testimonials: prev.testimonials.filter((_, i) => i !== idx),
    }));
  }

  function updateTestimonial(
    idx: number,
    field: keyof Testimonial,
    value: string
  ) {
    setConfig((prev) => ({
      ...prev,
      testimonials: prev.testimonials.map((t, i) =>
        i === idx ? { ...t, [field]: value } : t
      ),
    }));
  }

  function addFaq() {
    setConfig((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }],
    }));
  }

  function removeFaq(idx: number) {
    setConfig((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== idx),
    }));
  }

  function updateFaq(idx: number, field: keyof FAQ, value: string) {
    setConfig((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f, i) =>
        i === idx ? { ...f, [field]: value } : f
      ),
    }));
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <TopBar title="Cấu hình Sales Page" subtitle="Đang tải..." />
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-dark p-4 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-1/4 mb-3" />
              <div className="h-10 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notFoundState) {
    return (
      <div>
        <TopBar title="Cấu hình Sales Page" subtitle="Không tìm thấy" />
        <div className="p-6 max-w-3xl mx-auto">
          <div className="card-dark p-10 text-center">
            <p className="text-gray-400 text-sm mb-4">
              Không tìm thấy khoá học với slug này.
            </p>
            <Link href="/admin/courses" className="btn-green inline-flex">
              <ArrowLeft size={14} />
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <TopBar
        title="Cấu hình Sales Page"
        subtitle={productTitle}
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/admin/courses"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Quay lại
          </Link>
          <a
            href={`/sales/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "rgba(212,168,67,0.1)",
              color: "#D4A843",
              border: "1px solid rgba(212,168,67,0.2)",
            }}
          >
            <Eye size={12} />
            Xem Sales Page
          </a>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-amber-900/30 text-amber-400 border border-amber-800/40"
                : "bg-red-900/30 text-red-400 border border-red-800/40"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Info note */}
        <div
          className="p-3 rounded-lg text-sm text-gray-400"
          style={{
            background: "rgba(212,168,67,0.05)",
            border: "1px solid rgba(212,168,67,0.15)",
          }}
        >
          Để trống các phần bên dưới để sử dụng nội dung mặc định. Chỉ cấu hình khi muốn tuỳ chỉnh riêng cho khoá học này.
        </div>

        {/* ─── Guarantee Days ─── */}
        <div className="card-dark p-4 space-y-2">
          <label className="text-xs font-medium text-gray-400">
            Số ngày hoàn tiền
          </label>
          <input
            type="number"
            value={config.guaranteeDays}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                guaranteeDays: Number(e.target.value) || 7,
              }))
            }
            min={0}
            className="input-dark w-full"
          />
        </div>

        {/* ─── Pain Points ─── */}
        <div className="card-dark p-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">
              Vấn đề (Pain Points)
            </label>
            <button
              type="button"
              onClick={addPainPoint}
              className="flex items-center gap-1 text-xs text-[#D4A843] hover:text-[#FBBF24] transition-colors"
            >
              <Plus size={12} />
              Thêm
            </button>
          </div>

          {config.painPoints.length === 0 && (
            <p className="text-xs text-gray-500">
              Chưa có. Sẽ dùng nội dung mặc định.
            </p>
          )}

          {config.painPoints.map((point, i) => (
            <div
              key={i}
              className="rounded-lg p-3 space-y-2"
              style={{ background: "#1a1a1a", border: "1px solid #252525" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Vấn đề #{i + 1}</span>
                <button
                  type="button"
                  onClick={() => removePainPoint(i)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-[60px_1fr] gap-2">
                <input
                  type="text"
                  value={point.icon}
                  onChange={(e) => updatePainPoint(i, "icon", e.target.value)}
                  placeholder="Icon"
                  className="input-dark text-center text-lg"
                />
                <input
                  type="text"
                  value={point.title}
                  onChange={(e) => updatePainPoint(i, "title", e.target.value)}
                  placeholder="Tiêu đề"
                  className="input-dark"
                />
              </div>
              <textarea
                value={point.description}
                onChange={(e) => updatePainPoint(i, "description", e.target.value)}
                placeholder="Mô tả"
                rows={2}
                className="input-dark w-full resize-none"
              />
            </div>
          ))}
        </div>

        {/* ─── Benefits ─── */}
        <div className="card-dark p-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">
              Lợi ích (Benefits)
            </label>
            <button
              type="button"
              onClick={addBenefit}
              className="flex items-center gap-1 text-xs text-[#D4A843] hover:text-[#FBBF24] transition-colors"
            >
              <Plus size={12} />
              Thêm
            </button>
          </div>

          {config.benefits.length === 0 && (
            <p className="text-xs text-gray-500">
              Chưa có. Sẽ dùng nội dung mặc định.
            </p>
          )}

          {config.benefits.map((benefit, i) => (
            <div
              key={i}
              className="rounded-lg p-3 space-y-2"
              style={{ background: "#1a1a1a", border: "1px solid #252525" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Lợi ích #{i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeBenefit(i)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-[60px_1fr] gap-2">
                <input
                  type="text"
                  value={benefit.icon}
                  onChange={(e) => updateBenefit(i, "icon", e.target.value)}
                  placeholder="Icon"
                  className="input-dark text-center text-lg"
                />
                <input
                  type="text"
                  value={benefit.title}
                  onChange={(e) => updateBenefit(i, "title", e.target.value)}
                  placeholder="Tiêu đề"
                  className="input-dark"
                />
              </div>
              <textarea
                value={benefit.description}
                onChange={(e) => updateBenefit(i, "description", e.target.value)}
                placeholder="Mô tả"
                rows={2}
                className="input-dark w-full resize-none"
              />
            </div>
          ))}
        </div>

        {/* ─── Testimonials ─── */}
        <div className="card-dark p-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">
              Đánh giá (Testimonials)
            </label>
            <button
              type="button"
              onClick={addTestimonial}
              className="flex items-center gap-1 text-xs text-[#D4A843] hover:text-[#FBBF24] transition-colors"
            >
              <Plus size={12} />
              Thêm
            </button>
          </div>

          {config.testimonials.length === 0 && (
            <p className="text-xs text-gray-500">
              Chưa có. Sẽ hiển thị social proof chung.
            </p>
          )}

          {config.testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="rounded-lg p-3 space-y-2"
              style={{ background: "#1a1a1a", border: "1px solid #252525" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Đánh giá #{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeTestimonial(i)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={testimonial.name}
                  onChange={(e) =>
                    updateTestimonial(i, "name", e.target.value)
                  }
                  placeholder="Tên học viên"
                  className="input-dark"
                />
                <input
                  type="text"
                  value={testimonial.role}
                  onChange={(e) =>
                    updateTestimonial(i, "role", e.target.value)
                  }
                  placeholder="Vai trò (vd: Freelancer)"
                  className="input-dark"
                />
              </div>
              <textarea
                value={testimonial.text}
                onChange={(e) =>
                  updateTestimonial(i, "text", e.target.value)
                }
                placeholder="Nội dung đánh giá"
                rows={3}
                className="input-dark w-full resize-none"
              />
              <input
                type="text"
                value={testimonial.avatar ?? ""}
                onChange={(e) =>
                  updateTestimonial(i, "avatar", e.target.value)
                }
                placeholder="URL avatar (tuỳ chọn)"
                className="input-dark w-full"
              />
            </div>
          ))}
        </div>

        {/* ─── FAQs ─── */}
        <div className="card-dark p-4 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">
              Câu hỏi thường gặp (FAQ)
            </label>
            <button
              type="button"
              onClick={addFaq}
              className="flex items-center gap-1 text-xs text-[#D4A843] hover:text-[#FBBF24] transition-colors"
            >
              <Plus size={12} />
              Thêm
            </button>
          </div>

          {config.faqs.length === 0 && (
            <p className="text-xs text-gray-500">
              Chưa có. Sẽ dùng FAQ mặc định.
            </p>
          )}

          {config.faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-lg p-3 space-y-2"
              style={{ background: "#1a1a1a", border: "1px solid #252525" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">FAQ #{i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeFaq(i)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <input
                type="text"
                value={faq.question}
                onChange={(e) => updateFaq(i, "question", e.target.value)}
                placeholder="Câu hỏi"
                className="input-dark w-full"
              />
              <textarea
                value={faq.answer}
                onChange={(e) => updateFaq(i, "answer", e.target.value)}
                placeholder="Câu trả lời"
                rows={3}
                className="input-dark w-full resize-none"
              />
            </div>
          ))}
        </div>

        {/* ─── Save Button ─── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-green w-full justify-center"
        >
          <Save size={15} />
          {saving ? "Đang lưu..." : "Lưu cấu hình Sales Page"}
        </button>

        {/* Sales Page Link */}
        <div
          className="p-4 rounded-lg text-center"
          style={{
            background: "rgba(212,168,67,0.05)",
            border: "1px solid rgba(212,168,67,0.15)",
          }}
        >
          <p className="text-sm text-gray-400 mb-2">
            Link trang bán hàng:
          </p>
          <a
            href={`/sales/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D4A843] hover:text-[#FBBF24] transition-colors"
          >
            /sales/{slug}
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
