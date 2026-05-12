"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/client";
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
} from "lucide-react";

interface Lesson {
  id: string;
  chapter_id: string;
  product_id: string;
  title: string;
  description: string | null;
  youtube_id: string | null;
  duration_sec: number;
  content: string | null;
  sort_order: number;
  is_free: boolean;
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
  duration_sec: number;
  content: string;
  is_free: boolean;
}

const defaultLessonForm: LessonFormData = {
  title: "",
  description: "",
  youtube_id: "",
  duration_sec: 0,
  content: "",
  is_free: false,
};

export default function LessonsPage() {
  const params = useParams();
  const courseId = params.id as string;

  const [courseTitle, setCourseTitle] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Chapter form state
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState("");

  // Lesson form state
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null); // chapter_id or null
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonFormData>(defaultLessonForm);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "chapter" | "lesson";
    id: string;
    title: string;
  } | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch course title
    const { data: course } = await supabase
      .from("products")
      .select("title")
      .eq("id", courseId)
      .single();

    if (course) {
      setCourseTitle(course.title);
    }

    // Fetch chapters with lessons
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

          return {
            ...chapter,
            lessons: lessons || [],
          };
        })
      );

      setChapters(chaptersWithLessons);
    }

    setLoading(false);
  }, [courseId, supabase]);

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId, fetchData]);

  // Toggle chapter expand/collapse
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  // ===== CHAPTER CRUD =====

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) return;

    const maxOrder = chapters.length > 0
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

  // ===== LESSON CRUD =====

  const handleAddLesson = async (chapterId: string) => {
    if (!lessonForm.title.trim()) return;

    const chapter = chapters.find((c) => c.id === chapterId);
    const maxOrder = chapter && chapter.lessons.length > 0
      ? Math.max(...chapter.lessons.map((l) => l.sort_order))
      : -1;

    const { error } = await supabase.from("lessons").insert({
      chapter_id: chapterId,
      product_id: courseId,
      title: lessonForm.title.trim(),
      description: lessonForm.description || null,
      youtube_id: lessonForm.youtube_id || null,
      duration_sec: lessonForm.duration_sec || 0,
      content: lessonForm.content || null,
      is_free: lessonForm.is_free,
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
        duration_sec: lessonForm.duration_sec || 0,
        content: lessonForm.content || null,
        is_free: lessonForm.is_free,
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
      duration_sec: lesson.duration_sec,
      content: lesson.content || "",
      is_free: lesson.is_free,
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
      <TopBar title={`Quản lý bài học — ${courseTitle}`} subtitle="Thêm chương và bài học cho khoá học" />

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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen size={28} />
            Quản lý bài học — {courseTitle}
          </h1>
        </div>

        {/* Chapters List */}
        <div className="space-y-4">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="card-dark rounded-xl overflow-hidden">
              {/* Chapter Header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#2a2a2a] transition-colors"
                style={{ borderBottom: expandedChapters.has(chapter.id) ? "1px solid #2a2a2a" : "none" }}
                onClick={() => toggleChapter(chapter.id)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical size={18} className="text-gray-500" />
                  {expandedChapters.has(chapter.id) ? (
                    <ChevronDown size={18} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={18} className="text-gray-400" />
                  )}

                  {editingChapterId === chapter.id ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingChapterTitle}
                        onChange={(e) => setEditingChapterTitle(e.target.value)}
                        className="input-dark px-3 py-1 rounded text-sm"
                        autoFocus
                        onKeyDown={(e) => {
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
                    <span className="text-white font-medium">
                      {chapter.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
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

              {/* Expanded: Lessons */}
              {expandedChapters.has(chapter.id) && (
                <div className="px-5 py-4 space-y-3">
                  {chapter.lessons.length === 0 && (
                    <p className="text-gray-500 text-sm italic pl-10">
                      Chưa có bài học nào trong chương này.
                    </p>
                  )}

                  {chapter.lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between pl-10 pr-2 py-3 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                      style={{ backgroundColor: "#1a1a1a" }}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical size={14} className="text-gray-600" />
                        {lesson.youtube_id ? (
                          <Play size={16} className="text-amber-400" />
                        ) : (
                          <BookOpen size={16} className="text-gray-500" />
                        )}
                        <div>
                          <span className="text-white text-sm font-medium">
                            {lesson.title}
                          </span>
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
                  ))}

                  {/* Lesson Form */}
                  {showLessonForm === chapter.id && (
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
                          <label className="block text-gray-400 text-xs mb-1">
                            Mô tả
                          </label>
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
                                // Auto-extract ID từ URL YouTube nếu paste link
                                let val = e.target.value.trim();
                                const urlMatch = val.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
                                if (urlMatch) val = urlMatch[1];
                                setLessonForm({ ...lessonForm, youtube_id: val });
                              }}
                              className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                              placeholder="Paste link YouTube hoặc ID (vd: dQw4w9WgXcQ)"
                            />
                            <p className="text-[10px] text-gray-600 mt-1">
                              💡 Upload video lên YouTube ở chế độ <strong className="text-[#f59e0b]">Unlisted</strong> (Không công khai) → paste link vào đây. Video sẽ không hiện trên YouTube nhưng vẫn xem được trên web.
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

                        <div>
                          <label className="block text-gray-400 text-xs mb-1">
                            Nội dung (Markdown)
                          </label>
                          <textarea
                            value={lessonForm.content}
                            onChange={(e) =>
                              setLessonForm({ ...lessonForm, content: e.target.value })
                            }
                            className="input-dark w-full px-3 py-2 rounded-lg text-sm resize-y font-mono"
                            rows={5}
                            placeholder="Nội dung bài học (hỗ trợ Markdown)..."
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`is_free_${chapter.id}`}
                            checked={lessonForm.is_free}
                            onChange={(e) =>
                              setLessonForm({ ...lessonForm, is_free: e.target.checked })
                            }
                            className="rounded border-gray-600"
                          />
                          <label
                            htmlFor={`is_free_${chapter.id}`}
                            className="text-gray-400 text-sm"
                          >
                            Cho phép xem miễn phí (preview)
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() =>
                            editingLessonId
                              ? handleEditLesson(editingLessonId)
                              : handleAddLesson(chapter.id)
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
          ))}
        </div>

        {/* Add Chapter Section */}
        <div className="mt-6">
          {showAddChapter ? (
            <div
              className="card-dark rounded-xl p-5 space-y-4"
              style={{ border: "1px solid #2a2a2a" }}
            >
              <h3 className="text-white font-medium text-sm">Thêm chương mới</h3>
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
    </div>
  );
}
