"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  Users,
  Layers,
  Edit2,
  ExternalLink,
  Calendar,
  GripVertical,
  Loader2,
  Check,
} from "lucide-react";
import DeleteCourseButton from "@/components/admin/DeleteCourseButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseStatus = "draft" | "published" | "coming_soon" | "archived";

export interface AdminCourseItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  status: CourseStatus;
  price: number;
  sale_price: number | null;
  created_at: string;
  sort_order: number;
  chapterCount: number;
  lessonCount: number;
  enrolled: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price === 0) return "Miễn phí";
  return price.toLocaleString("vi-VN") + "₫";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

const STATUS_CONFIG: Record<CourseStatus, { label: string; className: string }> = {
  published: { label: "Đã xuất bản", className: "badge-green" },
  coming_soon: {
    label: "Sắp ra mắt",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-900/30 text-purple-400 border border-purple-800/40",
  },
  draft: {
    label: "Bản nháp",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-400 border border-gray-700",
  },
  archived: {
    label: "Đã lưu trữ",
    className:
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-900/30 text-red-400 border border-red-800/40",
  },
};

function StatusBadge({ status }: { status: CourseStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return <span className={cfg.className}>{cfg.label}</span>;
}

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function SortableCourseRow({
  course,
  isDragging,
}: {
  course: AdminCourseItem;
  isDragging: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isThisDragging ? 0.4 : 1,
    zIndex: isThisDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-dark p-5 transition-all ${
        isDragging ? "" : "hover:bg-[#1f1f1f]"
      } ${isThisDragging ? "ring-2 ring-[#D4A843]/40" : ""}`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-[#D4A843] transition-colors shrink-0 touch-none"
          aria-label="Kéo để sắp xếp"
          title="Kéo để sắp xếp"
        >
          <GripVertical size={18} />
        </button>

        {/* Thumbnail + Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {course.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "#252525",
                border: "1px solid #2a2a2a",
              }}
            >
              <BookOpen size={22} className="text-gray-500" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-white text-sm leading-snug">
                {course.title}
              </h3>
              <StatusBadge status={course.status} />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-1 mb-1">
              {course.description || "Chưa có mô tả"}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <ExternalLink size={10} />/{course.slug}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={10} />
                {formatDate(course.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-6 text-xs shrink-0">
          <div className="text-center">
            <div className="text-gray-400 mb-0.5">Chương</div>
            <div className="font-semibold text-white">{course.chapterCount}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 mb-0.5">Bài học</div>
            <div className="font-semibold text-white">{course.lessonCount}</div>
          </div>
          <Link
            href={`/admin/courses/${course.id}/students`}
            className="text-center group"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="text-gray-400 mb-0.5 group-hover:text-[#D4A843] transition-colors">
              Học viên
            </div>
            <div className="font-semibold text-white group-hover:text-[#D4A843] transition-colors">
              {course.enrolled.toLocaleString("vi-VN")}
            </div>
          </Link>
          <div className="text-center min-w-[80px]">
            <div className="text-gray-400 mb-0.5">Giá</div>
            <div className="font-semibold text-[#D4A843]">
              {formatPrice(course.sale_price ?? course.price ?? 0)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Link
            href={`/admin/courses/${course.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/5"
            style={{ border: "1px solid #2a2a2a" }}
          >
            <Edit2 size={12} />
            Sửa
          </Link>
          <Link
            href={`/admin/courses/${course.id}/students`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: "rgba(59,130,246,0.1)",
              color: "#3b82f6",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            <Users size={12} />
            Học viên
          </Link>
          <Link
            href={`/admin/courses/${course.id}/lessons`}
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
          <DeleteCourseButton
            courseId={course.id}
            courseTitle={course.title}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AdminCoursesList({
  initialCourses,
}: {
  initialCourses: AdminCourseItem[];
}) {
  const [courses, setCourses] = useState<AdminCourseItem[]>(initialCourses);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = courses.findIndex((c) => c.id === active.id);
    const newIndex = courses.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(courses, oldIndex, newIndex).map((c, idx) => ({
      ...c,
      sort_order: idx,
    }));

    setCourses(reordered);
    setSaveState("saving");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/courses/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "products",
          items: reordered.map((c) => ({ id: c.id, sort_order: c.sort_order })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch (err: unknown) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : "Lưu thất bại");
    }
  }

  return (
    <div className="space-y-3">
      {/* Hint + save state */}
      <div className="flex items-center justify-between text-xs">
        <p className="text-gray-500 italic">
          💡 Kéo biểu tượng ⋮⋮ bên trái để sắp xếp lại thứ tự khóa học. Thứ tự
          này quyết định khóa nào hiện trước ở trang khóa học công khai.
        </p>
        <div className="shrink-0">
          {saveState === "saving" && (
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              <Loader2 size={12} className="animate-spin" /> Đang lưu...
            </span>
          )}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-green-400">
              <Check size={12} /> Đã lưu thứ tự
            </span>
          )}
          {saveState === "error" && (
            <span className="text-red-400">
              ⚠ Lỗi: {errorMsg ?? "Lưu thất bại"}
            </span>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={courses.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {courses.map((course) => (
            <SortableCourseRow
              key={course.id}
              course={course}
              isDragging={saveState === "saving"}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
