"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  BookOpen,
  User,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LessonProgress {
  lessonId: string;
  completed: boolean;
  watchSec: number;
  updatedAt: string;
}

interface Question {
  id: string;
  content: string;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  lessonId: string | null;
}

export interface StudentInfo {
  enrollmentId: string;
  userId: string;
  enrolledAt: string;
  source: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  completedLessons: number;
  totalLessons: number;
  totalWatchSec: number;
  lastActivity: string | null;
  questionCount: number;
  lessonProgress: LessonProgress[];
  questions: Question[];
}

export interface ChapterInfo {
  id: string;
  title: string;
  sortOrder: number;
  lessons: {
    id: string;
    title: string;
    durationSec: number;
    sortOrder: number;
  }[];
}

interface Props {
  students: StudentInfo[];
  courseStructure: ChapterInfo[];
  courseId: string;
  totalLessons: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  if (sec <= 0) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} giờ trước`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD} ngày trước`;
  return formatDate(dateStr);
}

const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  purchase: { label: "Mua", cls: "bg-green-500/10 text-green-400" },
  gift: { label: "Tặng", cls: "bg-purple-500/10 text-purple-400" },
  admin: { label: "Admin cấp", cls: "bg-blue-500/10 text-blue-400" },
  free: { label: "Miễn phí", cls: "bg-gray-500/10 text-gray-400" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CourseStudentList({
  students: initialStudents,
  courseStructure,
  totalLessons,
}: Props) {
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "date" | "progress" | "name" | "activity"
  >("date");
  const [deleteTarget, setDeleteTarget] = useState<StudentInfo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    Record<string, "progress" | "qa">
  >({});

  // Filter + sort
  const filtered = useMemo(() => {
    let list = students;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "progress":
          return (
            b.completedLessons / Math.max(b.totalLessons, 1) -
            a.completedLessons / Math.max(a.totalLessons, 1)
          );
        case "name":
          return a.fullName.localeCompare(b.fullName);
        case "activity":
          if (!a.lastActivity && !b.lastActivity) return 0;
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return (
            new Date(b.lastActivity).getTime() -
            new Date(a.lastActivity).getTime()
          );
        default:
          return (
            new Date(b.enrolledAt).getTime() -
            new Date(a.enrolledAt).getTime()
          );
      }
    });
  }, [students, search, sortBy]);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/enrollments/${deleteTarget.enrollmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert("Lỗi: " + (data.error || "Không thể xoá"));
        return;
      }
      setStudents((prev) =>
        prev.filter((s) => s.enrollmentId !== deleteTarget.enrollmentId)
      );
      setDeleteTarget(null);
    } catch {
      alert("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  };

  const getTab = (id: string) => activeTab[id] || "progress";
  const setTab = (id: string, tab: "progress" | "qa") =>
    setActiveTab((prev) => ({ ...prev, [id]: tab }));

  return (
    <div className="space-y-4">
      {/* Search + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Tìm theo tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-[#151515] text-white placeholder-gray-600 outline-none focus:ring-1 focus:ring-[#D4A843]/40"
            style={{ border: "1px solid #2a2a2a" }}
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2.5 rounded-xl text-sm bg-[#151515] text-gray-300 outline-none cursor-pointer"
          style={{ border: "1px solid #2a2a2a" }}
        >
          <option value="date">Mới đăng ký</option>
          <option value="progress">Tiến độ cao nhất</option>
          <option value="name">Tên A-Z</option>
          <option value="activity">Hoạt động gần nhất</option>
        </select>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} học viên</p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-dark flex flex-col items-center justify-center py-16 text-center">
          <User size={40} className="text-gray-700 mb-3" />
          <p className="text-gray-500 text-sm">
            {search
              ? "Không tìm thấy học viên phù hợp."
              : "Chưa có học viên nào."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((student) => {
            const isExpanded = expandedId === student.enrollmentId;
            const pct =
              totalLessons > 0
                ? Math.round(
                    (student.completedLessons / totalLessons) * 100
                  )
                : 0;
            const src =
              SOURCE_LABELS[student.source] || SOURCE_LABELS.purchase;
            const tab = getTab(student.enrollmentId);

            // Progress lookup
            const pMap: Record<string, LessonProgress> = {};
            for (const p of student.lessonProgress) pMap[p.lessonId] = p;

            return (
              <div key={student.enrollmentId} className="card-dark overflow-hidden">
                {/* ── Main row ─────────────────────────── */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[#1f1f1f] transition-colors"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : student.enrollmentId)
                  }
                >
                  {/* Chevron */}
                  <div className="shrink-0 text-gray-500">
                    {isExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>

                  {/* Avatar */}
                  {student.avatarUrl ? (
                    <img
                      src={student.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#252525] flex items-center justify-center shrink-0 text-gray-500 text-sm font-semibold">
                      {student.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm truncate">
                        {student.fullName}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${src.cls}`}
                      >
                        {src.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {student.email}
                    </div>
                  </div>

                  {/* Desktop metrics */}
                  <div className="hidden lg:flex items-center gap-6 text-xs shrink-0">
                    <div className="text-center min-w-[70px]">
                      <div className="text-gray-500 mb-0.5">Ngày ĐK</div>
                      <div className="text-gray-300">
                        {formatDate(student.enrolledAt)}
                      </div>
                    </div>

                    <div className="text-center min-w-[110px]">
                      <div className="text-gray-500 mb-0.5">Tiến độ</div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#252525] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background:
                                pct === 100 ? "#22c55e" : "#D4A843",
                            }}
                          />
                        </div>
                        <span
                          className={
                            pct === 100
                              ? "text-green-400 font-semibold"
                              : "text-gray-300"
                          }
                        >
                          {student.completedLessons}/{totalLessons}
                        </span>
                      </div>
                    </div>

                    <div className="text-center min-w-[60px]">
                      <div className="text-gray-500 mb-0.5">Thời gian</div>
                      <div className="text-gray-300">
                        {formatDuration(student.totalWatchSec)}
                      </div>
                    </div>

                    <div className="text-center min-w-[80px]">
                      <div className="text-gray-500 mb-0.5">Lần cuối</div>
                      <div className="text-gray-300">
                        {student.lastActivity
                          ? timeAgo(student.lastActivity)
                          : "—"}
                      </div>
                    </div>

                    <div className="text-center min-w-[45px]">
                      <div className="text-gray-500 mb-0.5">Hỏi đáp</div>
                      <div className="text-gray-300">
                        {student.questionCount}
                      </div>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(student);
                    }}
                    className="shrink-0 p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Xoá học viên"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Mobile metrics */}
                <div className="lg:hidden px-4 pb-3 flex items-center gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-1.5 bg-[#252525] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100 ? "#22c55e" : "#D4A843",
                        }}
                      />
                    </div>
                    <span className="text-gray-400">{pct}%</span>
                  </div>
                  <span className="text-gray-700">|</span>
                  <span className="text-gray-400">
                    {formatDuration(student.totalWatchSec)}
                  </span>
                  <span className="text-gray-700">|</span>
                  <span className="text-gray-400">
                    {student.questionCount} câu hỏi
                  </span>
                </div>

                {/* ── Expanded detail ──────────────────── */}
                {isExpanded && (
                  <div className="border-t border-[#2a2a2a]">
                    {/* Tabs */}
                    <div className="flex border-b border-[#2a2a2a]">
                      <button
                        onClick={() =>
                          setTab(student.enrollmentId, "progress")
                        }
                        className={`px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          tab === "progress"
                            ? "text-[#D4A843] border-b-2 border-[#D4A843]"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <BookOpen size={13} />
                        Tiến độ học tập
                      </button>
                      <button
                        onClick={() => setTab(student.enrollmentId, "qa")}
                        className={`px-4 py-2.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          tab === "qa"
                            ? "text-[#D4A843] border-b-2 border-[#D4A843]"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <MessageSquare size={13} />
                        Câu hỏi ({student.questionCount})
                      </button>
                    </div>

                    {/* Tab content */}
                    {tab === "progress" ? (
                      /* ── Progress tab ─── */
                      <div className="p-4 space-y-4 max-h-[450px] overflow-y-auto">
                        {courseStructure.length === 0 && (
                          <p className="text-xs text-gray-600 text-center py-4">
                            Chưa có bài học nào.
                          </p>
                        )}
                        {courseStructure.map((chapter) => {
                          const done = chapter.lessons.filter(
                            (l) => pMap[l.id]?.completed
                          ).length;
                          return (
                            <div key={chapter.id}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                  {chapter.title}
                                </span>
                                <span className="text-[10px] text-gray-600">
                                  ({done}/{chapter.lessons.length})
                                </span>
                              </div>
                              <div className="space-y-0.5 ml-2">
                                {chapter.lessons.map((lesson) => {
                                  const lp = pMap[lesson.id];
                                  const completed = lp?.completed;
                                  return (
                                    <div
                                      key={lesson.id}
                                      className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-[#1a1a1a]"
                                    >
                                      {completed ? (
                                        <CheckCircle2
                                          size={14}
                                          className="text-green-400 shrink-0"
                                        />
                                      ) : (
                                        <Circle
                                          size={14}
                                          className="text-gray-600 shrink-0"
                                        />
                                      )}
                                      <span
                                        className={`text-xs flex-1 ${
                                          completed
                                            ? "text-gray-300"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {lesson.title}
                                      </span>
                                      <div className="flex items-center gap-3 text-[10px] text-gray-600">
                                        {lp && lp.watchSec > 0 && (
                                          <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatDuration(lp.watchSec)}
                                          </span>
                                        )}
                                        {lesson.durationSec > 0 && (
                                          <span>
                                            {formatDuration(lesson.durationSec)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* ── Q&A tab ─── */
                      <div className="p-4 space-y-3 max-h-[450px] overflow-y-auto">
                        {student.questions.length === 0 ? (
                          <p className="text-xs text-gray-600 text-center py-4">
                            Chưa có câu hỏi nào.
                          </p>
                        ) : (
                          student.questions.map((q) => (
                            <div
                              key={q.id}
                              className="p-3 rounded-lg"
                              style={{
                                background: "#1a1a1a",
                                border: "1px solid #252525",
                              }}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <MessageSquare
                                  size={12}
                                  className="text-[#D4A843] mt-0.5 shrink-0"
                                />
                                <p className="text-xs text-gray-300 flex-1">
                                  {q.content}
                                </p>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                                    q.status === "answered"
                                      ? "bg-green-500/10 text-green-400"
                                      : q.status === "closed"
                                      ? "bg-gray-500/10 text-gray-400"
                                      : "bg-yellow-500/10 text-yellow-400"
                                  }`}
                                >
                                  {q.status === "answered"
                                    ? "Đã trả lời"
                                    : q.status === "closed"
                                    ? "Đã đóng"
                                    : "Chờ trả lời"}
                                </span>
                              </div>
                              {q.reply && (
                                <div className="ml-5 pl-3 border-l-2 border-[#2a2a2a]">
                                  <p className="text-xs text-gray-400">
                                    {q.reply}
                                  </p>
                                  {q.repliedAt && (
                                    <span className="text-[10px] text-gray-600 mt-1 block">
                                      {formatDate(q.repliedAt)}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="text-[10px] text-gray-600 mt-2 ml-5">
                                {formatDate(q.createdAt)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete confirmation modal ──────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(239,68,68,0.1)" }}
              >
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Xoá học viên khỏi khoá học?
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hành động này không thể hoàn tác
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-lg text-sm"
              style={{
                background: "#151515",
                border: "1px solid #252525",
              }}
            >
              <div className="flex items-center gap-3">
                {deleteTarget.avatarUrl ? (
                  <img
                    src={deleteTarget.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#252525] flex items-center justify-center text-gray-500 text-xs font-semibold">
                    {deleteTarget.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-medium text-white text-sm">
                    {deleteTarget.fullName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {deleteTarget.email}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Tiến độ học tập và dữ liệu liên quan của học viên sẽ bị xoá. Học
              viên sẽ không còn truy cập được khoá học này.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                style={{ border: "1px solid #2a2a2a" }}
              >
                Huỷ bỏ
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                style={{
                  background: deleting ? "#4a1a1a" : "#dc2626",
                  opacity: deleting ? 0.7 : 1,
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Đang xoá...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Xác nhận xoá
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
