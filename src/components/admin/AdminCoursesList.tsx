"use client";

import { useMemo, useState } from "react";
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
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BookOpen,
  Layers,
  Edit2,
  ExternalLink,
  GripVertical,
  Loader2,
  Check,
  Video,
  Sparkles,
  Globe,
  Layout,
  Package,
  GraduationCap,
  Inbox,
} from "lucide-react";
import DeleteCourseButton from "@/components/admin/DeleteCourseButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseStatus = "draft" | "published" | "coming_soon" | "archived";

type CategoryKey =
  | "video"
  | "video_tool"
  | "channel"
  | "website"
  | "digital_product"
  | "coaching"
  | "_uncategorized";

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
  category: string | null;
  chapterCount: number;
  lessonCount: number;
  enrolled: number;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES: {
  key: CategoryKey;
  title: string;
  subtitle: string;
  icon: typeof Video;
  color: string;
}[] = [
  {
    key: "video",
    title: "Khóa học làm video",
    subtitle: "Học cách tạo video chuyên nghiệp",
    icon: Video,
    color: "#3b82f6",
  },
  {
    key: "video_tool",
    title: "Tool làm video",
    subtitle: "Bộ công cụ + template làm video nhanh 10x",
    icon: Sparkles,
    color: "#06b6d4",
  },
  {
    key: "channel",
    title: "Khóa học xây kênh",
    subtitle: "Xây dựng kênh và thương hiệu cá nhân",
    icon: Globe,
    color: "#a855f7",
  },
  {
    key: "website",
    title: "Website All-in-One",
    subtitle: "Tự build hệ thống website + bán hàng + CRM",
    icon: Layout,
    color: "#f59e0b",
  },
  {
    key: "digital_product",
    title: "Bán sản phẩm số",
    subtitle: "Tạo và bán sản phẩm số tự động",
    icon: Package,
    color: "#ec4899",
  },
  {
    key: "coaching",
    title: "Coaching 1 năm",
    subtitle: "Mentorship 1:1 đồng hành 12 tháng",
    icon: GraduationCap,
    color: "#22c55e",
  },
  {
    key: "_uncategorized",
    title: "Chưa phân loại",
    subtitle: "Cần gán category cho các khóa này",
    icon: Inbox,
    color: "#6b7280",
  },
];

const STATUS_CONFIG: Record<CourseStatus, { label: string; className: string }> = {
  published: { label: "Đã xuất bản", className: "badge-green" },
  coming_soon: {
    label: "Sắp ra mắt",
    className:
      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-900/30 text-purple-400 border border-purple-800/40",
  },
  draft: {
    label: "Bản nháp",
    className:
      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-800 text-gray-400 border border-gray-700",
  },
  archived: {
    label: "Lưu trữ",
    className:
      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-900/30 text-red-400 border border-red-800/40",
  },
};

function formatPrice(price: number): string {
  if (price === 0) return "Miễn phí";
  return price.toLocaleString("vi-VN") + "₫";
}

// ─── Sortable Card ────────────────────────────────────────────────────────────

function SortableCourseCard({ course }: { course: AdminCourseItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const hasSale =
    course.sale_price !== null && course.sale_price < course.price;
  const displayPrice = hasSale ? course.sale_price! : course.price;
  const isFree = course.price === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-dark overflow-hidden flex flex-col group ${
        isDragging ? "ring-2 ring-[#D4A843]/40" : "hover:ring-1 hover:ring-white/10"
      } transition-all`}
    >
      {/* Thumbnail with overlay */}
      <div className="relative aspect-video bg-[#1a1a1a] overflow-hidden">
        {course.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#252525] to-[#1a1a1a]">
            <BookOpen size={36} className="text-gray-700" />
          </div>
        )}

        {/* Drag handle (top-left) */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 w-7 h-7 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing bg-black/60 backdrop-blur text-white hover:bg-black/80 transition-colors touch-none"
          aria-label="Kéo để sắp xếp"
          title="Kéo để sắp xếp"
        >
          <GripVertical size={14} />
        </button>

        {/* Status badge (top-right) */}
        <div className="absolute top-2 right-2">
          <span className={STATUS_CONFIG[course.status].className}>
            {STATUS_CONFIG[course.status].label}
          </span>
        </div>

        {/* Price badge (bottom-left) */}
        <div className="absolute bottom-2 left-2">
          {isFree ? (
            <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#22c55e] text-white shadow-md">
              Miễn phí
            </span>
          ) : (
            <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#D4A843] text-black shadow-md">
              {formatPrice(displayPrice)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 flex flex-col flex-1">
        <h3 className="font-semibold text-white text-sm leading-snug mb-1.5 line-clamp-2 min-h-[2.5em]">
          {course.title}
        </h3>

        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2.5">
          <ExternalLink size={9} />
          <span className="truncate">/{course.slug}</span>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-1 mb-3 text-[11px]">
          <div className="text-center px-1 py-1.5 rounded bg-white/5">
            <div className="text-gray-500 text-[9px] mb-0.5">Chương</div>
            <div className="font-semibold text-white">
              {course.chapterCount}
            </div>
          </div>
          <div className="text-center px-1 py-1.5 rounded bg-white/5">
            <div className="text-gray-500 text-[9px] mb-0.5">Bài</div>
            <div className="font-semibold text-white">{course.lessonCount}</div>
          </div>
          <Link
            href={`/admin/courses/${course.id}/students`}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-center px-1 py-1.5 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
          >
            <div className="text-blue-400 text-[9px] mb-0.5">HV</div>
            <div className="font-semibold text-blue-300">
              {course.enrolled.toLocaleString("vi-VN")}
            </div>
          </Link>
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <div
          className="grid grid-cols-3 gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Link
            href={`/admin/courses/${course.id}`}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            style={{ border: "1px solid #2a2a2a" }}
            title="Sửa khoá học"
          >
            <Edit2 size={11} /> Sửa
          </Link>
          <Link
            href={`/admin/courses/${course.id}/lessons`}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors"
            style={{
              background: "rgba(212,168,67,0.12)",
              color: "#D4A843",
              border: "1px solid rgba(212,168,67,0.25)",
            }}
            title="Quản lý chương / bài học"
          >
            <Layers size={11} /> Bài
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

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  iconColor,
  count,
}: {
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  iconColor: string;
  count: number;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${iconColor}15` }}
      >
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: `${iconColor}15`,
              color: iconColor,
              border: `1px solid ${iconColor}30`,
            }}
          >
            {count} khóa
          </span>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Category Section (one DndContext per category) ───────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

function CategorySection({
  category,
  courses,
  onReorder,
  saveState,
  errorMsg,
}: {
  category: (typeof CATEGORIES)[number];
  courses: AdminCourseItem[];
  onReorder: (categoryKey: CategoryKey, reordered: AdminCourseItem[]) => void;
  saveState: SaveState;
  errorMsg: string | null;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = courses.findIndex((c) => c.id === active.id);
    const newIndex = courses.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(courses, oldIndex, newIndex);
    onReorder(category.key, reordered);
  }

  if (courses.length === 0) return null;

  return (
    <section className="mb-8" id={`admin-cat-${category.key}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionHeader
          icon={category.icon}
          title={category.title}
          subtitle={category.subtitle}
          iconColor={category.color}
          count={courses.length}
        />
        <div className="shrink-0 text-xs">
          {saveState === "saving" && (
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              <Loader2 size={12} className="animate-spin" /> Đang lưu...
            </span>
          )}
          {saveState === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-green-400">
              <Check size={12} /> Đã lưu
            </span>
          )}
          {saveState === "error" && (
            <span className="text-red-400">⚠ {errorMsg ?? "Lỗi"}</span>
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
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <SortableCourseCard key={course.id} course={course} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminCoursesList({
  initialCourses,
}: {
  initialCourses: AdminCourseItem[];
}) {
  const [courses, setCourses] = useState<AdminCourseItem[]>(initialCourses);
  const [saveStateByCat, setSaveStateByCat] = useState<
    Partial<Record<CategoryKey, SaveState>>
  >({});
  const [errorMsgByCat, setErrorMsgByCat] = useState<
    Partial<Record<CategoryKey, string>>
  >({});

  // Group courses by category
  const groupedCourses = useMemo(() => {
    const groups: Record<CategoryKey, AdminCourseItem[]> = {
      video: [],
      video_tool: [],
      channel: [],
      website: [],
      digital_product: [],
      coaching: [],
      _uncategorized: [],
    };
    for (const c of courses) {
      const key = (c.category as CategoryKey) ?? "_uncategorized";
      if (key in groups) {
        groups[key].push(c);
      } else {
        groups._uncategorized.push(c);
      }
    }
    // Sort each group by sort_order asc
    for (const k of Object.keys(groups) as CategoryKey[]) {
      groups[k].sort((a, b) => a.sort_order - b.sort_order);
    }
    return groups;
  }, [courses]);

  async function handleReorder(
    categoryKey: CategoryKey,
    reordered: AdminCourseItem[]
  ) {
    // Update local state optimistically. Recompute sort_order globally so
    // category groups don't collide on shared sort_order values.
    setSaveStateByCat((s) => ({ ...s, [categoryKey]: "saving" }));
    setErrorMsgByCat((e) => ({ ...e, [categoryKey]: undefined }));

    // Build new courses array: keep other categories as-is, replace this one
    const updatedCourses = courses.map((c) => {
      if (((c.category as CategoryKey) ?? "_uncategorized") !== categoryKey) {
        return c;
      }
      const newPos = reordered.findIndex((r) => r.id === c.id);
      return { ...c, sort_order: newPos };
    });

    // Reassign global sort_order: walk through CATEGORIES order, give each
    // category a 1000-block range so within-category sort_order stays local
    const finalCourses: AdminCourseItem[] = [];
    let cursor = 0;
    for (const cat of CATEGORIES) {
      const sortedGroup = updatedCourses
        .filter(
          (c) => ((c.category as CategoryKey) ?? "_uncategorized") === cat.key
        )
        .sort((a, b) => a.sort_order - b.sort_order);
      for (const c of sortedGroup) {
        finalCourses.push({ ...c, sort_order: cursor });
        cursor++;
      }
    }

    setCourses(finalCourses);

    try {
      const res = await fetch("/api/admin/courses/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "products",
          items: finalCourses.map((c) => ({
            id: c.id,
            sort_order: c.sort_order,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setSaveStateByCat((s) => ({ ...s, [categoryKey]: "saved" }));
      setTimeout(() => {
        setSaveStateByCat((s) => ({ ...s, [categoryKey]: "idle" }));
      }, 1500);
    } catch (err: unknown) {
      setSaveStateByCat((s) => ({ ...s, [categoryKey]: "error" }));
      setErrorMsgByCat((e) => ({
        ...e,
        [categoryKey]: err instanceof Error ? err.message : "Lưu thất bại",
      }));
    }
  }

  return (
    <div>
      <div className="card-dark p-3 mb-6 flex items-start gap-3 text-xs text-gray-400">
        <div className="text-lg leading-none mt-0.5">💡</div>
        <div className="leading-relaxed">
          Kéo biểu tượng <GripVertical size={11} className="inline" /> ở góc
          trên-trái mỗi card để sắp xếp lại thứ tự khóa học{" "}
          <span className="text-white font-medium">trong cùng một menu</span>.
          Thứ tự này quyết định khóa nào hiện trước ở trang khóa học công khai.
          Muốn đổi khóa sang menu khác, vào <span className="text-[#D4A843]">Sửa</span>{" "}
          → chọn lại Phân loại.
        </div>
      </div>

      {CATEGORIES.map((cat) => (
        <CategorySection
          key={cat.key}
          category={cat}
          courses={groupedCourses[cat.key]}
          onReorder={handleReorder}
          saveState={saveStateByCat[cat.key] ?? "idle"}
          errorMsg={errorMsgByCat[cat.key] ?? null}
        />
      ))}

      {courses.length === 0 && (
        <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">Chưa có khoá học nào.</p>
        </div>
      )}
    </div>
  );
}
