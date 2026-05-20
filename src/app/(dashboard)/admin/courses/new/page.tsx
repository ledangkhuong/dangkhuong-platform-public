"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import TopBar from "@/components/layout/TopBar";
import { Plus, Loader2, GraduationCap } from "lucide-react";
import ThumbnailUpload from "@/components/admin/ThumbnailUpload";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function NewCoursePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<string>("");
  const [type, setType] = useState("course");
  const [tierRequired, setTierRequired] = useState("free");
  const [status, setStatus] = useState("draft");
  const [category, setCategory] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [instructorId, setInstructorId] = useState<string>("");
  const [instructors, setInstructors] = useState<{ id: string; full_name: string | null }[]>([]);

  // Auth check
  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const allowedRoles = ["admin", "manager", "editor"];
      if (!profile || !allowedRoles.includes(profile.role)) {
        router.push("/");
        return;
      }

      setLoading(false);

      // Fetch instructors
      const { data: instrData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "instructor")
        .order("full_name");
      if (instrData) setInstructors(instrData);
    }

    checkAdmin();
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    setSlug(generateSlug(title));
  }, [title]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Tiêu đề không được để trống");
      return;
    }
    if (!slug.trim()) {
      setError("Đường dẫn không được để trống");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("products").insert({
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      thumbnail: thumbnail.trim() || null,
      price,
      sale_price: salePrice ? parseInt(salePrice) : null,
      type,
      tier_required: tierRequired,
      status,
      category: category || null,
      sort_order: sortOrder,
      instructor_id: instructorId || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    router.push("/admin/courses");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#111]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111]">
      <TopBar title="Tạo khoá học mới" subtitle="Thêm khoá học vào nền tảng" />

      <div className="max-w-3xl mx-auto px-4 py-8">

        <form onSubmit={handleSubmit} className="card-dark p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Tiêu đề */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Tiêu đề <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề sản phẩm"
              className="input-dark w-full"
              required
            />
          </div>

          {/* Đường dẫn (Slug) */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Đường dẫn <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="duong-dan-san-pham"
              className="input-dark w-full"
              required
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về sản phẩm"
              rows={4}
              className="input-dark w-full resize-none"
            />
          </div>

          {/* Ảnh bìa */}
          <div>
            <ThumbnailUpload
              value={thumbnail}
              onChange={(url) => setThumbnail(url)}
            />
          </div>

          {/* Giá gốc & Giá khuyến mãi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Giá gốc (VNĐ)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                min={0}
                className="input-dark w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Giá khuyến mãi (VNĐ)
              </label>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                min={0}
                placeholder="Để trống nếu không có"
                className="input-dark w-full"
              />
            </div>
          </div>

          {/* Loại sản phẩm & Cấp độ yêu cầu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Loại sản phẩm
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input-dark w-full"
              >
                <option value="course">Course</option>
                <option value="ebook">Ebook</option>
                <option value="template">Template</option>
                <option value="membership">Membership</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Cấp độ yêu cầu
              </label>
              <select
                value={tierRequired}
                onChange={(e) => setTierRequired(e.target.value)}
                className="input-dark w-full"
              >
                <option value="free">Free</option>
                <option value="member">Member</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          </div>

          {/* Trạng thái & Thứ tự sắp xếp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Trạng thái
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-dark w-full"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="coming_soon">Coming Soon</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Thứ tự sắp xếp
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                min={0}
                className="input-dark w-full"
              />
            </div>
          </div>

          {/* Danh mục */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Danh mục khoá học
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">— Chưa phân loại —</option>
              <option value="video">Khóa học làm video</option>
              <option value="branding">Khóa học xây kênh, thương hiệu cá nhân</option>
              <option value="business">Khóa học kinh doanh, hệ thống chuyển đổi cao</option>
              <option value="personal_development">Khóa học phát triển bản thân</option>
            </select>
          </div>

          {/* Giảng viên */}
          <div>
            <label className="text-sm text-gray-400 mb-1.5 flex items-center gap-1.5">
              <GraduationCap size={13} />
              Giảng viên phụ trách
            </label>
            <select
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              className="input-dark w-full"
            >
              <option value="">— Chưa phân công —</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.full_name || inst.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-green w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Tạo sản phẩm
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
