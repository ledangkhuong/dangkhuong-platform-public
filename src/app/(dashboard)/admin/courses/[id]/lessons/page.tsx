"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import TopBar from "@/components/layout/TopBar";
import ThumbnailUpload from "@/components/admin/ThumbnailUpload";
import { createClient } from "@/lib/supabase/client";

const NovelEditor = dynamic(() => import("@/components/editor/NovelEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-8 text-gray-500 text-sm gap-2">
      <span className="animate-spin">⏳</span> Đang tải editor...
    </div>
  ),
});
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
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
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Play,
  BookOpen,
  Eye,
  Save,
  X,
  Copy,
  FolderOutput,
  Check,
  Loader2,
  Clock,
  Paperclip,
  Link2 as LinkIcon,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface Lesson {
  id: string;
  chapter_id: string;
  product_id: string;
  title: string;
  description: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  duration_sec: number;
  content: string | null;
  sort_order: number;
  is_free: boolean;
  unlock_after_days: number;
  attachments: LessonAttachment[];
  created_at: string;
}

interface Chapter {
  id: string;
  product_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  lessons: Lesson[];
}

interface LessonFormData {
  title: string;
  description: string;
  youtube_id: string;
  thumbnail_url: string;
  duration_sec: number;
  content: string;
  is_free: boolean;
  unlock_after_days: number;
  attachments: LessonAttachment[];
}

interface CourseOption {
  id: string;
  title: string;
}

const defaultLessonForm: LessonFormData = {
  title: "",
  description: "",
  youtube_id: "",
  thumbnail_url: "",
  duration_sec: 0,
  content: "",
  is_free: false,
  unlock_after_days: 0,
  attachments: [],
};

// ─── Sortable Chapter ─────────────────────────────────────────────────────────

function SortableChapterItem({
  chapter,
  children,
}: {
  chapter: Chapter;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Pass listeners to children via data attribute on grip */}
      <div data-chapter-listeners={JSON.stringify(listeners)}>
        {children}
      </div>
    </div>
  );
}

// ─── Sortable Lesson ──────────────────────────────────────────────────────────

function SortableLessonItem({
  lesson,
  children,
}: {
  lesson: Lesson;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div data-lesson-listeners={JSON.stringify(listeners)}>
        {children}
      </div>
    </div>
  );
}

// ─── Drag Handle ──────────────────────────────────────────────────────────────

function DragHandle({
  listeners,
  size = 18,
}: {
  listeners: Record<string, any> | undefined;
  size?: number;
}) {
  return (
    <button
      className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1 -ml-1 touch-none"
      {...listeners}
      tabIndex={-1}
    >
      <GripVertical size={size} />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LessonsPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [courseTitle, setCourseTitle] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );

  // Chapter form state
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");

  // Lesson form state
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonFormData>(defaultLessonForm);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "chapter" | "lesson";
    id: string;
    title: string;
  } | null>(null);

  // Copy content modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [allCourses, setAllCourses] = useState<CourseOption[]>([]);
  const [selectedTargetCourse, setSelectedTargetCourse] = useState("");
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(
    new Set()
  );
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyResult, setCopyResult] = useState<string | null>(null);

  // Duplicate course
  const [duplicating, setDuplicating] = useState(false);

  // Drag state
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activeLessonChapterId, setActiveLessonChapterId] = useState<
    string | null
  >(null);

  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: course } = await supabase
      .from("products")
      .select("title")
      .eq("id", courseId)
      .single();

    if (course) setCourseTitle(course.title);

    const { data: chaptersData } = await supabase
      .from("chapters")
      .select("*")
      .eq("product_id", courseId)
      .order("sort_order", { ascending: true });

    if (chaptersData) {
      const chaptersWithLessons: Chapter[] = await Promise.all(
        chaptersData.map(async (chapter) => {
          const { data: lessons } = await supabase
            .from("lessons")
            .select("*")
            .eq("chapter_id", chapter.id)
            .order("sort_order", { ascending: true });

          return { ...chapter, lessons: lessons || [] };
        })
      );
      setChapters(chaptersWithLessons);
    }

    setLoading(false);
  }, [courseId, supabase]);

  useEffect(() => {
    if (courseId) fetchData();
  }, [courseId, fetchData]);

  // ─── Chapter expand/collapse ────────────────────────────────────────────────

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  // ─── CHAPTER CRUD ───────────────────────────────────────────────────────────

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;
    const maxOrder =
      chapters.length > 0
        ? Math.max(...chapters.map((c) => c.sort_order))
        : -1;

    const { error } = await supabase.from("chapters").insert({
      product_id: courseId,
      title: newChapterTitle.trim(),
      sort_order: maxOrder + 1,
    });

    if (!error) {
      setNewChapterTitle("");
      setShowAddChapter(false);
      fetchData();
    }
  };

  const handleEditChapter = async (chapterId: string) => {
    if (!editingChapterTitle.trim()) return;
    const { error } = await supabase
      .from("chapters")
      .update({ title: editingChapterTitle.trim() })
      .eq("id", chapterId);

    if (!error) {
      setEditingChapterId(null);
      setEditingChapterTitle("");
      fetchData();
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const { error } = await supabase
      .from("chapters")
      .delete()
      .eq("id", chapterId);
    if (!error) {
      setDeleteConfirm(null);
      fetchData();
    }
  };

  // ─── LESSON CRUD ───────────────────────────────────────────────────────────

  const handleAddLesson = async (chapterId: string) => {
    if (!lessonForm.title.trim()) return;
    const chapter = chapters.find((c) => c.id === chapterId);
    const maxOrder =
      chapter && chapter.lessons.length > 0
        ? Math.max(...chapter.lessons.map((l) => l.sort_order))
        : -1;

    const { error } = await supabase.from("lessons").insert({
      chapter_id: chapterId,
      product_id: courseId,
      title: lessonForm.title.trim(),
      description: lessonForm.description || null,
      youtube_id: lessonForm.youtube_id || null,
      thumbnail_url: lessonForm.thumbnail_url || null,
      duration_sec: lessonForm.duration_sec || 0,
      content: lessonForm.content || null,
      is_free: lessonForm.is_free,
      unlock_after_days: lessonForm.unlock_after_days || 0,
      attachments: lessonForm.attachments,
      sort_order: maxOrder + 1,
    });

    if (!error) {
      setShowLessonForm(null);
      setLessonForm(defaultLessonForm);
      fetchData();
    }
  };

  const handleEditLesson = async (lessonId: string) => {
    if (!lessonForm.title.trim()) return;
    const { error } = await supabase
      .from("lessons")
      .update({
        title: lessonForm.title.trim(),
        description: lessonForm.description || null,
        youtube_id: lessonForm.youtube_id || null,
        thumbnail_url: lessonForm.thumbnail_url || null,
        duration_sec: lessonForm.duration_sec || 0,
        content: lessonForm.content || null,
        is_free: lessonForm.is_free,
        unlock_after_days: lessonForm.unlock_after_days || 0,
        attachments: lessonForm.attachments,
      })
      .eq("id", lessonId);

    if (!error) {
      setEditingLessonId(null);
      setShowLessonForm(null);
      setLessonForm(defaultLessonForm);
      fetchData();
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);
    if (!error) {
      setDeleteConfirm(null);
      fetchData();
    }
  };

  const startEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setShowLessonForm(lesson.chapter_id);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || "",
      youtube_id: lesson.youtube_id || "",
      thumbnail_url: lesson.thumbnail_url || "",
      duration_sec: lesson.duration_sec,
      content: lesson.content || "",
      is_free: lesson.is_free,
      unlock_after_days: lesson.unlock_after_days || 0,
      attachments: lesson.attachments || [],
    });
  };

  const cancelLessonForm = () => {
    setShowLessonForm(null);
    setEditingLessonId(null);
    setLessonForm(defaultLessonForm);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ─── DRAG & DROP ────────────────────────────────────────────────────────────

  const saveReorder = async (
    type: "chapters" | "lessons",
    items: { id: string; sort_order: number }[]
  ) => {
    await fetch("/api/admin/courses/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, items }),
    });
  };

  const handleChapterDragStart = (event: DragStartEvent) => {
    setActiveChapterId(event.active.id as string);
  };

  const handleChapterDragEnd = async (event: DragEndEvent) => {
    setActiveChapterId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex((c) => c.id === active.id);
    const newIndex = chapters.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(chapters, oldIndex, newIndex);
    setChapters(reordered);

    await saveReorder(
      "chapters",
      reordered.map((c, i) => ({ id: c.id, sort_order: i }))
    );
  };

  const handleLessonDragEnd = async (
    event: DragEndEvent,
    chapterId: string
  ) => {
    setActiveLessonChapterId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;

    const oldIndex = chapter.lessons.findIndex((l) => l.id === active.id);
    const newIndex = chapter.lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedLessons = arrayMove(chapter.lessons, oldIndex, newIndex);

    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId ? { ...c, lessons: reorderedLessons } : c
      )
    );

    await saveReorder(
      "lessons",
      reorderedLessons.map((l, i) => ({ id: l.id, sort_order: i }))
    );
  };

  // ─── DUPLICATE COURSE ──────────────────────────────────────────────────────

  const handleDuplicateCourse = async () => {
    if (duplicating) return;
    setDuplicating(true);

    try {
      const res = await fetch("/api/admin/courses/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId }),
      });

      const data = await res.json();
      if (data.success && data.newCourseId) {
        router.push(`/admin/courses/${data.newCourseId}/lessons`);
      }
    } finally {
      setDuplicating(false);
    }
  };

  // ─── COPY CONTENT TO ANOTHER COURSE ─────────────────────────────────────────

  const openCopyModal = async () => {
    setShowCopyModal(true);
    setCopyResult(null);
    setSelectedChapterIds(new Set());
    setSelectedTargetCourse("");

    // Fetch all courses except current
    const { data } = await supabase
      .from("products")
      .select("id, title")
      .neq("id", courseId)
      .order("sort_order", { ascending: true });

    setAllCourses(data ?? []);
  };

  const toggleChapterSelect = (id: string) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllChapters = () => {
    if (selectedChapterIds.size === chapters.length) {
      setSelectedChapterIds(new Set());
    } else {
      setSelectedChapterIds(new Set(chapters.map((c) => c.id)));
    }
  };

  const handleCopyContent = async () => {
    if (!selectedTargetCourse || selectedChapterIds.size === 0) return;
    setCopyLoading(true);
    setCopyResult(null);

    try {
      const res = await fetch("/api/admin/courses/copy-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_course_id: courseId,
          target_course_id: selectedTargetCourse,
          chapter_ids: Array.from(selectedChapterIds),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCopyResult(
          `Đã sao chép ${data.copiedChapters} chương và ${data.copiedLessons} bài học thành công!`
        );
      } else {
        setCopyResult(`Lỗi: ${data.error}`);
      }
    } finally {
      setCopyLoading(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#111" }}>
        <TopBar title="Quản lý bài học" subtitle="Đang tải..." />
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#111" }}>
      <TopBar
        title={`Quản lý bài học — ${courseTitle}`}
        subtitle="Thêm chương và bài học cho khoá học"
      />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Quay lại danh sách khóa học</span>
          </Link>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <BookOpen size={28} />
              Quản lý bài học — {courseTitle}
            </h1>

            <div className="flex items-center gap-2">
              {/* Duplicate course */}
              <button
                onClick={handleDuplicateCourse}
                disabled={duplicating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-50"
                style={{ border: "1px solid #2a2a2a" }}
              >
                {duplicating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Copy size={15} />
                )}
                Sao chép khoá học
              </button>

              {/* Copy content to another course */}
              <button
                onClick={openCopyModal}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <FolderOutput size={15} />
                Sao chép nội dung sang khoá khác
              </button>
            </div>
          </div>
        </div>

        {/* Chapters List with DnD */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleChapterDragStart}
          onDragEnd={handleChapterDragEnd}
        >
          <SortableContext
            items={chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {chapters.map((chapter) => (
                <SortableChapterItem key={chapter.id} chapter={chapter}>
                  <ChapterCard
                    chapter={chapter}
                    courseId={courseId}
                    expanded={expandedChapters.has(chapter.id)}
                    onToggle={() => toggleChapter(chapter.id)}
                    editingChapterId={editingChapterId}
                    editingChapterTitle={editingChapterTitle}
                    setEditingChapterId={setEditingChapterId}
                    setEditingChapterTitle={setEditingChapterTitle}
                    handleEditChapter={handleEditChapter}
                    setDeleteConfirm={setDeleteConfirm}
                    showLessonForm={showLessonForm}
                    setShowLessonForm={setShowLessonForm}
                    editingLessonId={editingLessonId}
                    setEditingLessonId={setEditingLessonId}
                    lessonForm={lessonForm}
                    setLessonForm={setLessonForm}
                    handleAddLesson={handleAddLesson}
                    handleEditLesson={handleEditLesson}
                    startEditLesson={startEditLesson}
                    cancelLessonForm={cancelLessonForm}
                    formatDuration={formatDuration}
                    sensors={sensors}
                    handleLessonDragEnd={handleLessonDragEnd}
                    chapters={chapters}
                    setChapters={setChapters}
                  />
                </SortableChapterItem>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeChapterId ? (
              <div className="card-dark rounded-xl px-5 py-4 opacity-90 shadow-2xl border border-[#D4A843]/40">
                <span className="text-white font-medium">
                  {chapters.find((c) => c.id === activeChapterId)?.title}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add Chapter Section */}
        <div className="mt-6">
          {showAddChapter ? (
            <div
              className="card-dark rounded-xl p-5 space-y-4"
              style={{ border: "1px solid #2a2a2a" }}
            >
              <h3 className="text-white font-medium text-sm">
                Thêm chương mới
              </h3>
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                placeholder="Nhập tên chương..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddChapter();
                  if (e.key === "Escape") setShowAddChapter(false);
                }}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddChapter}
                  className="btn-green px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
                >
                  <Save size={14} />
                  Lưu chương
                </button>
                <button
                  onClick={() => {
                    setShowAddChapter(false);
                    setNewChapterTitle("");
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddChapter(true)}
              className="btn-green px-5 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Thêm chương mới
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="card-dark rounded-2xl p-6 max-w-md w-full mx-4 space-y-4"
            style={{ border: "1px solid #2a2a2a" }}
          >
            <h3 className="text-white font-bold text-lg">Xác nhận xóa</h3>
            <p className="text-gray-400 text-sm">
              Bạn có chắc muốn xóa{" "}
              {deleteConfirm.type === "chapter" ? "chương" : "bài học"}{" "}
              <span className="text-white font-medium">
                &ldquo;{deleteConfirm.title}&rdquo;
              </span>
              ?
              {deleteConfirm.type === "chapter" && (
                <span className="block mt-2 text-red-400">
                  Tất cả bài học trong chương này cũng sẽ bị xóa.
                </span>
              )}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() =>
                  deleteConfirm.type === "chapter"
                    ? handleDeleteChapter(deleteConfirm.id)
                    : handleDeleteLesson(deleteConfirm.id)
                }
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                Xóa
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Content Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="card-dark rounded-2xl p-6 max-w-lg w-full mx-4 space-y-5 max-h-[85vh] overflow-y-auto"
            style={{ border: "1px solid #2a2a2a" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <FolderOutput size={20} className="text-blue-400" />
                Sao chép nội dung sang khoá khác
              </h3>
              <button
                onClick={() => setShowCopyModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Select target course */}
            <div>
              <label className="block text-gray-400 text-xs mb-2 font-medium">
                Khoá học đích
              </label>
              <select
                value={selectedTargetCourse}
                onChange={(e) => setSelectedTargetCourse(e.target.value)}
                className="input-dark w-full px-3 py-2.5 rounded-lg text-sm"
              >
                <option value="">— Chọn khoá học —</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Select chapters to copy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-400 text-xs font-medium">
                  Chọn chương cần sao chép
                </label>
                <button
                  onClick={selectAllChapters}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {selectedChapterIds.size === chapters.length
                    ? "Bỏ chọn tất cả"
                    : "Chọn tất cả"}
                </button>
              </div>
              <div className="space-y-2">
                {chapters.map((ch) => (
                  <label
                    key={ch.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: selectedChapterIds.has(ch.id)
                        ? "rgba(59,130,246,0.08)"
                        : "#1a1a1a",
                      border: selectedChapterIds.has(ch.id)
                        ? "1px solid rgba(59,130,246,0.3)"
                        : "1px solid #2a2a2a",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChapterIds.has(ch.id)}
                      onChange={() => toggleChapterSelect(ch.id)}
                      className="rounded border-gray-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {ch.title}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {ch.lessons.length} bài học
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Result message */}
            {copyResult && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: copyResult.startsWith("Lỗi")
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(34,197,94,0.1)",
                  color: copyResult.startsWith("Lỗi") ? "#ef4444" : "#22c55e",
                  border: copyResult.startsWith("Lỗi")
                    ? "1px solid rgba(239,68,68,0.2)"
                    : "1px solid rgba(34,197,94,0.2)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Check size={16} />
                  {copyResult}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCopyContent}
                disabled={
                  copyLoading ||
                  !selectedTargetCourse ||
                  selectedChapterIds.size === 0
                }
                className="btn-green px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copyLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FolderOutput size={15} />
                )}
                Sao chép {selectedChapterIds.size} chương
              </button>
              <button
                onClick={() => setShowCopyModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chapter Card Component ───────────────────────────────────────────────────

function ChapterCard({
  chapter,
  courseId,
  expanded,
  onToggle,
  editingChapterId,
  editingChapterTitle,
  setEditingChapterId,
  setEditingChapterTitle,
  handleEditChapter,
  setDeleteConfirm,
  showLessonForm,
  setShowLessonForm,
  editingLessonId,
  setEditingLessonId,
  lessonForm,
  setLessonForm,
  handleAddLesson,
  handleEditLesson,
  startEditLesson,
  cancelLessonForm,
  formatDuration,
  sensors,
  handleLessonDragEnd,
  chapters,
  setChapters,
}: any) {
  const { listeners } = useSortable({ id: chapter.id });

  return (
    <div className="card-dark rounded-xl overflow-hidden">
      {/* Chapter Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
        style={{
          borderBottom: expanded ? "1px solid #2a2a2a" : "none",
        }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div onClick={(e) => e.stopPropagation()}>
            <DragHandle listeners={listeners} />
          </div>
          {expanded ? (
            <ChevronDown size={18} className="text-gray-400" />
          ) : (
            <ChevronRight size={18} className="text-gray-400" />
          )}

          {editingChapterId === chapter.id ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editingChapterTitle}
                onChange={(e) => setEditingChapterTitle(e.target.value)}
                className="input-dark px-3 py-1 rounded text-sm"
                autoFocus
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter") handleEditChapter(chapter.id);
                  if (e.key === "Escape") setEditingChapterId(null);
                }}
              />
              <button
                onClick={() => handleEditChapter(chapter.id)}
                className="text-amber-400 hover:text-amber-300 p-1"
              >
                <Save size={16} />
              </button>
              <button
                onClick={() => setEditingChapterId(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <span className="text-white font-medium">{chapter.title}</span>
          )}
        </div>

        <div
          className="flex items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-gray-500 text-sm">
            {chapter.lessons.length} bài học
          </span>
          <button
            onClick={() => {
              setEditingChapterId(chapter.id);
              setEditingChapterTitle(chapter.title);
            }}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Sửa chương"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() =>
              setDeleteConfirm({
                type: "chapter",
                id: chapter.id,
                title: chapter.title,
              })
            }
            className="text-gray-400 hover:text-red-400 p-1 rounded transition-colors"
            title="Xóa chương"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded: Lessons with DnD */}
      {expanded && (
        <div className="px-5 py-4 space-y-3">
          {chapter.lessons.length === 0 && (
            <p className="text-gray-500 text-sm italic pl-10">
              Chưa có bài học nào trong chương này.
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e: DragEndEvent) =>
              handleLessonDragEnd(e, chapter.id)
            }
          >
            <SortableContext
              items={chapter.lessons.map((l: Lesson) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {chapter.lessons.map((lesson: Lesson) => (
                <SortableLessonRow
                  key={lesson.id}
                  lesson={lesson}
                  startEditLesson={startEditLesson}
                  setDeleteConfirm={setDeleteConfirm}
                  formatDuration={formatDuration}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Lesson Form */}
          {showLessonForm === chapter.id && (
            <LessonFormComponent
              chapterId={chapter.id}
              editingLessonId={editingLessonId}
              lessonForm={lessonForm}
              setLessonForm={setLessonForm}
              handleAddLesson={handleAddLesson}
              handleEditLesson={handleEditLesson}
              cancelLessonForm={cancelLessonForm}
            />
          )}

          {/* Add Lesson Button */}
          {showLessonForm !== chapter.id && (
            <button
              onClick={() => {
                setShowLessonForm(chapter.id);
                setEditingLessonId(null);
                setLessonForm(defaultLessonForm);
              }}
              className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 pl-10 py-2 transition-colors"
            >
              <Plus size={16} />
              Thêm bài học
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sortable Lesson Row ──────────────────────────────────────────────────────

function SortableLessonRow({
  lesson,
  startEditLesson,
  setDeleteConfirm,
  formatDuration,
}: {
  lesson: Lesson;
  startEditLesson: (l: Lesson) => void;
  setDeleteConfirm: (v: any) => void;
  formatDuration: (s: number) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: "#1a1a1a" }}
      className="flex items-center justify-between pl-10 pr-2 py-3 rounded-lg hover:bg-[#2a2a2a] transition-colors"
      {...attributes}
    >
      <div className="flex items-center gap-3">
        <DragHandle listeners={listeners} size={14} />
        {lesson.youtube_id ? (
          <Play size={16} className="text-amber-400" />
        ) : (
          <BookOpen size={16} className="text-gray-500" />
        )}
        <div>
          <span className="text-white text-sm font-medium">{lesson.title}</span>
          <div className="flex items-center gap-3 mt-0.5">
            {lesson.duration_sec > 0 && (
              <span className="text-gray-500 text-xs">
                {formatDuration(lesson.duration_sec)}
              </span>
            )}
            {lesson.is_free && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                <Eye size={12} />
                Xem miễn phí
              </span>
            )}
            {lesson.unlock_after_days > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                <Clock size={12} />
                Mở sau {lesson.unlock_after_days} ngày
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => startEditLesson(lesson)}
          className="text-gray-400 hover:text-white p-1.5 rounded transition-colors"
          title="Sửa bài học"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={() =>
            setDeleteConfirm({
              type: "lesson",
              id: lesson.id,
              title: lesson.title,
            })
          }
          className="text-gray-400 hover:text-red-400 p-1.5 rounded transition-colors"
          title="Xóa bài học"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Lesson Form Component ────────────────────────────────────────────────────

function LessonFormComponent({
  chapterId,
  editingLessonId,
  lessonForm,
  setLessonForm,
  handleAddLesson,
  handleEditLesson,
  cancelLessonForm,
}: {
  chapterId: string;
  editingLessonId: string | null;
  lessonForm: LessonFormData;
  setLessonForm: (v: LessonFormData) => void;
  handleAddLesson: (chapterId: string) => void;
  handleEditLesson: (lessonId: string) => void;
  cancelLessonForm: () => void;
}) {
  return (
    <div
      className="mt-4 p-5 rounded-xl space-y-4"
      style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
    >
      <h4 className="text-white font-medium text-sm">
        {editingLessonId ? "Sửa bài học" : "Thêm bài học mới"}
      </h4>

      <div className="space-y-3">
        <div>
          <label className="block text-gray-400 text-xs mb-1">
            Tiêu đề <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={lessonForm.title}
            onChange={(e) =>
              setLessonForm({ ...lessonForm, title: e.target.value })
            }
            className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            placeholder="Nhập tiêu đề bài học..."
          />
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-1">Mô tả</label>
          <textarea
            value={lessonForm.description}
            onChange={(e) =>
              setLessonForm({ ...lessonForm, description: e.target.value })
            }
            className="input-dark w-full px-3 py-2 rounded-lg text-sm resize-y"
            rows={2}
            placeholder="Mô tả ngắn về bài học..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1">
              YouTube Video ID
            </label>
            <input
              type="text"
              value={lessonForm.youtube_id}
              onChange={(e) => {
                let val = e.target.value.trim();
                const urlMatch = val.match(
                  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
                );
                if (urlMatch) val = urlMatch[1];
                setLessonForm({ ...lessonForm, youtube_id: val });
              }}
              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
              placeholder="Paste link YouTube hoặc ID (vd: dQw4w9WgXcQ)"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Upload video lên YouTube ở chế độ{" "}
              <strong className="text-[#f59e0b]">Unlisted</strong> (Không công
              khai) rồi paste link vào đây.
            </p>
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">
              Thời lượng (giây)
            </label>
            <input
              type="number"
              value={lessonForm.duration_sec}
              onChange={(e) =>
                setLessonForm({
                  ...lessonForm,
                  duration_sec: parseInt(e.target.value) || 0,
                })
              }
              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
              min={0}
              placeholder="0"
            />
          </div>
        </div>

        {/* Ảnh bài học — hiển thị khi không có video */}
        <div>
          <label className="block text-gray-400 text-xs mb-1">
            Ảnh bài học{" "}
            <span className="text-gray-600">(hiển thị khi không có video)</span>
          </label>
          <ThumbnailUpload
            value={lessonForm.thumbnail_url}
            onChange={(url) =>
              setLessonForm({ ...lessonForm, thumbnail_url: url })
            }
          />
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-1">
            Nội dung bài học
          </label>
          <NovelEditor
            key={`lesson-editor-${editingLessonId || "new"}`}
            initialHtml={lessonForm.content || ""}
            onChange={(html) =>
              setLessonForm({ ...lessonForm, content: html })
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`is_free_${chapterId}`}
            checked={lessonForm.is_free}
            onChange={(e) =>
              setLessonForm({ ...lessonForm, is_free: e.target.checked })
            }
            className="rounded border-gray-600"
          />
          <label
            htmlFor={`is_free_${chapterId}`}
            className="text-gray-400 text-sm"
          >
            Cho phép xem miễn phí (preview)
          </label>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-1">
            Mở khoá sau (ngày)
          </label>
          <input
            type="number"
            value={lessonForm.unlock_after_days}
            onChange={(e) =>
              setLessonForm({
                ...lessonForm,
                unlock_after_days: parseInt(e.target.value) || 0,
              })
            }
            className="input-dark w-full px-3 py-2 rounded-lg text-sm"
            min={0}
            placeholder="0"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            0 = mở ngay khi ghi danh. Ví dụ: 7 = mở sau 7 ngày kể từ khi học viên ghi danh.
          </p>
        </div>
      </div>

      {/* Attachments section */}
      <LessonAttachmentsSection
        attachments={lessonForm.attachments}
        onAttachmentsChange={(attachments) =>
          setLessonForm({ ...lessonForm, attachments })
        }
      />

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() =>
            editingLessonId
              ? handleEditLesson(editingLessonId)
              : handleAddLesson(chapterId)
          }
          className="btn-green px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
        >
          <Save size={14} />
          {editingLessonId ? "Cập nhật" : "Lưu bài học"}
        </button>
        <button
          onClick={cancelLessonForm}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

// ─── Lesson Attachments Section (Link-based) ────────────────────────────────

function LessonAttachmentsSection({
  attachments,
  onAttachmentsChange,
}: {
  attachments: LessonAttachment[];
  onAttachmentsChange: (attachments: LessonAttachment[]) => void;
}) {
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = () => {
    const url = linkUrl.trim();
    const name = linkName.trim() || url;
    if (!url) return;

    onAttachmentsChange([
      ...attachments,
      { url, name, size: 0, type: "link" },
    ]);
    setLinkName("");
    setLinkUrl("");
    setShowAddForm(false);
  };

  const handleRemove = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div
      className="p-4 rounded-lg space-y-3"
      style={{ backgroundColor: "#151515", border: "1px solid #252525" }}
    >
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-gray-400 text-xs font-medium">
          <Paperclip size={14} />
          Tài liệu đính kèm
        </label>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-white/5 transition-colors"
            style={{ border: "1px solid #2a2a2a" }}
          >
            <LinkIcon size={13} />
            Thêm link tài liệu
          </button>
        )}
      </div>

      {/* Add link form */}
      {showAddForm && (
        <div className="space-y-2 p-3 rounded-lg" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <input
            type="text"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="Tên tài liệu (vd: Slide bài giảng)"
            className="input-dark w-full px-3 py-2 rounded-lg text-xs"
          />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Link tài liệu (Google Drive, Notion, ...)"
            className="input-dark w-full px-3 py-2 rounded-lg text-xs"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setLinkName(""); setLinkUrl(""); }}
              className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!linkUrl.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D4A843] text-black hover:bg-[#c49a3a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={12} />
              Thêm
            </button>
          </div>
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-gray-500 text-xs italic">
          Chưa có tài liệu nào. Thêm link Google Drive, Notion, hoặc bất kỳ link nào.
        </p>
      ) : (
        <div className="space-y-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <LinkIcon size={14} className="text-blue-400 shrink-0" />
                <span className="text-white text-xs truncate">{att.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-[#D4A843] p-1 transition-colors"
                  title="Mở link"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  onClick={() => handleRemove(idx)}
                  className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                  title="Xóa tài liệu"
                  type="button"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
