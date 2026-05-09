"use client";

import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  Plus,
  BookOpen,
  Users,
  MoreHorizontal,
  Edit2,
  Trash2,
  EyeOff,
  Layers,
  X,
  DollarSign,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type CourseStatus = "active" | "draft" | "upcoming";

interface Course {
  id: number;
  emoji: string;
  title: string;
  description: string;
  status: CourseStatus;
  chapters: number;
  lessons: number;
  enrolled: number;
  price: number;
}

interface NewCourseForm {
  title: string;
  description: string;
  price: string;
  thumbnail: string;
  status: CourseStatus;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_COURSES: Course[] = [
  {
    id: 1,
    emoji: "🚀",
    title: "Thương Hiệu Cá Nhân 90 Ngày",
    description: "Xây dựng thương hiệu cá nhân từ con số 0 trong 90 ngày với lộ trình rõ ràng",
    status: "active",
    chapters: 8,
    lessons: 32,
    enrolled: 847,
    price: 1497000,
  },
  {
    id: 2,
    emoji: "📧",
    title: "Email Marketing Thực Chiến",
    description: "Viết email bán hàng hiệu quả, xây danh sách và tạo automation thu nhập thụ động",
    status: "active",
    chapters: 5,
    lessons: 21,
    enrolled: 312,
    price: 797000,
  },
  {
    id: 3,
    emoji: "📦",
    title: "Digital Product Từ A-Z",
    description: "Tạo, đóng gói và bán sản phẩm số — từ ebook, template đến khoá học online",
    status: "draft",
    chapters: 3,
    lessons: 12,
    enrolled: 89,
    price: 0,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price === 0) return "Miễn phí";
  return price.toLocaleString("vi-VN") + "₫";
}

const STATUS_CONFIG: Record<CourseStatus, { label: string; className: string }> = {
  active: { label: "Đang bán", className: "badge-green" },
  draft: {
    label: "Bản nháp",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700",
  },
  upcoming: { label: "Sắp ra", className: "badge-gold" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CourseStatus }) {
  const cfg = STATUS_CONFIG[status];
  return <span className={cfg.className}>{cfg.label}</span>;
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: color + "18" }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-bold text-white leading-none mb-1">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function CourseRow({
  course,
  onEdit,
  onDelete,
  onToggleHide,
}: {
  course: Course;
  onEdit: (course: Course) => void;
  onDelete: (id: number) => void;
  onToggleHide: (id: number) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div
      className="card-dark p-5 hover:bg-[#1f1f1f] transition-all"
      style={{ position: "relative" }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Thumbnail + Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: "#252525", border: "1px solid #2a2a2a" }}
          >
            {course.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-white text-sm leading-snug">{course.title}</h3>
              <StatusBadge status={course.status} />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {course.description}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-6 text-xs shrink-0">
          <div className="text-center">
            <div className="text-gray-400 mb-0.5">Chương</div>
            <div className="font-semibold text-white">{course.chapters}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 mb-0.5">Bài học</div>
            <div className="font-semibold text-white">{course.lessons}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 mb-0.5">Học viên</div>
            <div className="font-semibold text-white">{course.enrolled.toLocaleString("vi-VN")}</div>
          </div>
          <div className="text-center min-w-[80px]">
            <div className="text-gray-400 mb-0.5">Giá</div>
            <div className="font-semibold text-[#22c55e]">{formatPrice(course.price)}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(course)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/5"
            style={{ border: "1px solid #2a2a2a" }}
          >
            <Edit2 size={12} />
            Sửa
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "rgba(34,197,94,0.1)",
              color: "#22c55e",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <Layers size={12} />
            Quản lý bài học
          </button>

          {/* Dropdown "..." */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              style={{ border: "1px solid #2a2a2a" }}
            >
              <MoreHorizontal size={15} />
            </button>
            {dropdownOpen && (
              <>
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 40,
                  }}
                  onClick={() => setDropdownOpen(false)}
                />
                <div
                  className="card-dark py-1"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 6px)",
                    zIndex: 50,
                    minWidth: 160,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <button
                    onClick={() => {
                      onToggleHide(course.id);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <EyeOff size={13} />
                    Ẩn khoá học
                  </button>
                  <div style={{ height: 1, background: "#2a2a2a", margin: "4px 0" }} />
                  <button
                    onClick={() => {
                      onDelete(course.id);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-white/5 transition-colors"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 size={13} />
                    Xoá khoá học
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

const EMPTY_FORM: NewCourseForm = {
  title: "",
  description: "",
  price: "",
  thumbnail: "",
  status: "draft",
};

function CourseModal({
  open,
  editingCourse,
  onClose,
  onSave,
}: {
  open: boolean;
  editingCourse: Course | null;
  onClose: () => void;
  onSave: (form: NewCourseForm) => void;
}) {
  const [form, setForm] = useState<NewCourseForm>(
    editingCourse
      ? {
          title: editingCourse.title,
          description: editingCourse.description,
          price: editingCourse.price === 0 ? "" : String(editingCourse.price),
          thumbnail: editingCourse.emoji,
          status: editingCourse.status,
        }
      : EMPTY_FORM
  );

  // Sync form when editingCourse changes
  useState(() => {
    if (editingCourse) {
      setForm({
        title: editingCourse.title,
        description: editingCourse.description,
        price: editingCourse.price === 0 ? "" : String(editingCourse.price),
        thumbnail: editingCourse.emoji,
        status: editingCourse.status,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  });

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        className="card-dark"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(540px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          padding: "28px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            {editingCourse ? "Sửa khoá học" : "+ Tạo khoá học mới"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tên khoá học */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Tên khoá học <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              className="input-dark"
              placeholder="VD: Thương Hiệu Cá Nhân 90 Ngày"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Mô tả ngắn</label>
            <textarea
              className="input-dark"
              placeholder="Mô tả ngắn về nội dung và lợi ích khoá học..."
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Thumbnail emoji */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Thumbnail (emoji)
              </label>
              <input
                className="input-dark"
                placeholder="🚀"
                value={form.thumbnail}
                onChange={(e) => setForm((f) => ({ ...f, thumbnail: e.target.value }))}
                maxLength={4}
              />
            </div>

            {/* Giá */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Giá (VND)
              </label>
              <div style={{ position: "relative" }}>
                <DollarSign
                  size={14}
                  className="text-gray-500"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  className="input-dark"
                  style={{ paddingLeft: 32 }}
                  placeholder="0 = Miễn phí"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Trạng thái</label>
            <select
              className="input-dark"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as CourseStatus }))
              }
            >
              <option value="draft">Bản nháp</option>
              <option value="active">Đang bán</option>
              <option value="upcoming">Sắp ra mắt</option>
            </select>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              style={{ border: "1px solid #2a2a2a", background: "transparent" }}
            >
              Huỷ
            </button>
            <button type="submit" className="btn-green flex-1 justify-center">
              {editingCourse ? "Lưu thay đổi" : "Tạo khoá học"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const totalLessons = courses.reduce((sum, c) => sum + c.lessons, 0);
  const totalEnrolled = courses.reduce((sum, c) => sum + c.enrolled, 0);

  function openCreate() {
    setEditingCourse(null);
    setModalOpen(true);
  }

  function openEdit(course: Course) {
    setEditingCourse(course);
    setModalOpen(true);
  }

  function handleDelete(id: number) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function handleToggleHide(id: number) {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "draft" ? ("active" as CourseStatus) : ("draft" as CourseStatus) }
          : c
      )
    );
  }

  function handleSave(form: NewCourseForm) {
    if (editingCourse) {
      // Update existing
      setCourses((prev) =>
        prev.map((c) =>
          c.id === editingCourse.id
            ? {
                ...c,
                title: form.title,
                description: form.description,
                price: form.price === "" ? 0 : Number(form.price),
                emoji: form.thumbnail || c.emoji,
                status: form.status,
              }
            : c
        )
      );
    } else {
      // Create new
      const next: Course = {
        id: Date.now(),
        emoji: form.thumbnail || "📚",
        title: form.title,
        description: form.description,
        status: form.status,
        chapters: 0,
        lessons: 0,
        enrolled: 0,
        price: form.price === "" ? 0 : Number(form.price),
      };
      setCourses((prev) => [next, ...prev]);
    }
    setModalOpen(false);
    setEditingCourse(null);
  }

  return (
    <>
      <div>
        <TopBar
          title="Quản lý Khoá học"
          subtitle="Tạo và quản lý nội dung khoá học trên nền tảng"
        />

        <div className="p-6 max-w-5xl mx-auto space-y-6">

          {/* Header action row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-white text-base">Danh sách khoá học</h2>
              <p className="text-xs text-gray-500 mt-0.5">{courses.length} khoá học đang quản lý</p>
            </div>
            <button className="btn-green" onClick={openCreate}>
              <Plus size={15} />
              Tạo khoá học mới
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<BookOpen size={20} />}
              label="Tổng khoá học"
              value={String(courses.length)}
              color="#22c55e"
            />
            <StatCard
              icon={<Layers size={20} />}
              label="Tổng bài học"
              value={String(totalLessons)}
              color="#f59e0b"
            />
            <StatCard
              icon={<Users size={20} />}
              label="Học viên đang học"
              value={totalEnrolled.toLocaleString("vi-VN")}
              color="#3b82f6"
            />
          </div>

          {/* Course list */}
          <div className="space-y-3">
            {courses.length === 0 && (
              <div
                className="card-dark flex flex-col items-center justify-center py-16 text-center"
              >
                <BookOpen size={40} className="text-gray-700 mb-3" />
                <p className="text-gray-500 text-sm">Chưa có khoá học nào.</p>
                <button className="btn-green mt-4" onClick={openCreate}>
                  <Plus size={14} />
                  Tạo khoá học đầu tiên
                </button>
              </div>
            )}
            {courses.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggleHide={handleToggleHide}
              />
            ))}
          </div>

        </div>
      </div>

      {/* Modal */}
      <CourseModal
        open={modalOpen}
        editingCourse={editingCourse}
        onClose={() => {
          setModalOpen(false);
          setEditingCourse(null);
        }}
        onSave={handleSave}
      />
    </>
  );
}
