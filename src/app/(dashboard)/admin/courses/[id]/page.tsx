"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import TopBar from "@/components/layout/TopBar";
import { ArrowLeft, Save, Layers } from "lucide-react";
import ThumbnailUpload from "@/components/admin/ThumbnailUpload";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseForm {
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  price: number;
  sale_price: number | null;
  type: string;
  tier_required: string;
  status: string;
  sort_order: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [form, setForm] = useState<CourseForm>({
    title: "",
    slug: "",
    description: "",
    thumbnail: "",
    price: 0,
    sale_price: null,
    type: "course",
    tier_required: "free",
    status: "draft",
    sort_order: 0,
  });

  // ─── Fetch course data ────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchCourse() {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setForm({
        title: data.title ?? "",
        slug: data.slug ?? "",
        description: data.description ?? "",
        thumbnail: data.thumbnail ?? "",
        price: data.price ?? 0,
        sale_price: data.sale_price ?? null,
        type: data.type ?? "course",
        tier_required: data.tier_required ?? "free",
        status: data.status ?? "draft",
        sort_order: data.sort_order ?? 0,
      });
      setLoading(false);
    }

    if (id) fetchCourse();
  }, [id]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug when title changes
    if (name === "title") {
      setForm((prev) => ({ ...prev, slug: generateSlug(value) }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      description: form.description.trim(),
      thumbnail: form.thumbnail.trim() || null,
      price: Number(form.price) || 0,
      sale_price: form.sale_price ? Number(form.sale_price) : null,
      type: form.type,
      tier_required: form.tier_required,
      status: form.status,
      sort_order: Number(form.sort_order) || 0,
    };

    if (!payload.title || !payload.slug) {
      setMessage({ type: "error", text: "Tiêu đề và slug không được để trống." });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id);

    if (error) {
      setMessage({
        type: "error",
        text: `Lỗi khi cập nhật: ${error.message}`,
      });
    } else {
      setMessage({ type: "success", text: "Cập nhật khoá học thành công!" });
    }

    setSaving(false);
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <TopBar title="Chỉnh sửa khoá học" subtitle="Đang tải..." />
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-dark p-4 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-1/4 mb-3" />
              <div className="h-10 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Not found state ──────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div>
        <TopBar title="Chỉnh sửa khoá học" subtitle="Không tìm thấy" />
        <div className="p-6 max-w-3xl mx-auto">
          <div className="card-dark p-10 text-center">
            <p className="text-gray-400 text-sm mb-4">
              Không tìm thấy khoá học với ID này.
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

  // ─── Form ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <TopBar
        title="Chỉnh sửa khoá học"
        subtitle="Cập nhật thông tin khoá học"
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/admin/courses"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Quay lại
          </Link>
          <Link
            href={`/admin/courses/${id}/lessons`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "rgba(212,168,67,0.1)",
              color: "#D4A843",
              border: "1px solid rgba(212,168,67,0.2)",
            }}
          >
            <Layers size={12} />
            Quản lý bài học
          </Link>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="card-dark p-4 space-y-2">
            <label className="text-xs font-medium text-gray-400">
              Tiêu đề khoá học <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Nhập tiêu đề khoá học"
              className="input-dark w-full"
              required
            />
          </div>

          {/* Slug */}
          <div className="card-dark p-4 space-y-2">
            <label className="text-xs font-medium text-gray-400">
              Slug (URL) <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              placeholder="url-khoa-hoc"
              className="input-dark w-full"
              required
            />
            <p className="text-[11px] text-gray-600">
              Tự động tạo từ tiêu đề. Có thể chỉnh sửa thủ công.
            </p>
          </div>

          {/* Description */}
          <div className="card-dark p-4 space-y-2">
            <label className="text-xs font-medium text-gray-400">
              Mô tả
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Mô tả ngắn về khoá học"
              rows={4}
              className="input-dark w-full resize-none"
            />
          </div>

          {/* Thumbnail */}
          <div className="card-dark p-4">
            <ThumbnailUpload
              value={form.thumbnail}
              onChange={(url) => setForm((prev) => ({ ...prev, thumbnail: url }))}
            />
          </div>

          {/* Price + Sale Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-dark p-4 space-y-2">
              <label className="text-xs font-medium text-gray-400">
                Giá (VNĐ)
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                min={0}
                className="input-dark w-full"
              />
            </div>
            <div className="card-dark p-4 space-y-2">
              <label className="text-xs font-medium text-gray-400">
                Giá khuyến mãi (VNĐ)
              </label>
              <input
                type="number"
                name="sale_price"
                value={form.sale_price ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sale_price: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                min={0}
                placeholder="Để trống nếu không giảm giá"
                className="input-dark w-full"
              />
            </div>
          </div>

          {/* Type + Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-dark p-4 space-y-2">
              <label className="text-xs font-medium text-gray-400">
                Loại sản phẩm
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="input-dark w-full"
              >
                <option value="course">Khoá học</option>
                <option value="ebook">Ebook</option>
                <option value="template">Template</option>
              </select>
            </div>
            <div className="card-dark p-4 space-y-2">
              <label className="text-xs font-medium text-gray-400">
                Tier yêu cầu
              </label>
              <select
                name="tier_required"
                value={form.tier_required}
                onChange={handleChange}
                className="input-dark w-full"
              >
                <option value="free">Miễn phí</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          {/* Status + Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-dark p-4 space-y-2">
              <label className="text-xs font-medium text-gray-400">
                Trạng thái
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="input-dark w-full"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Đã xuất bản</option>
                <option value="archived">Đã lưu trữ</option>
              </select>
            </div>
            <div className="card-dark p-4 space-y-2">
              <label className="text-xs font-medium text-gray-400">
                Thứ tự sắp xếp
              </label>
              <input
                type="number"
                name="sort_order"
                value={form.sort_order}
                onChange={handleChange}
                min={0}
                className="input-dark w-full"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="btn-green w-full justify-center"
          >
            <Save size={15} />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </div>
    </div>
  );
}
