"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import TopBar from "@/components/layout/TopBar";
import {
  Loader2,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
}

interface StudentProgress {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  product_id: string;
  course_title: string | null;
  enrolled_at: string;
  total_lessons: number;
  completed_lessons: number;
  completion_percent: number;
  last_activity: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateVN(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Chưa hoạt động";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDateVN(iso);
}

function progressColor(percent: number): string {
  if (percent >= 70) return "#22c55e";
  if (percent >= 30) return "#eab308";
  return "#f97316";
}

function progressGradient(percent: number): string {
  if (percent >= 70) return "linear-gradient(90deg, #16a34a, #22c55e)";
  if (percent >= 30) return "linear-gradient(90deg, #ca8a04, #eab308)";
  return "linear-gradient(90deg, #ea580c, #f97316)";
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Component ──────────────────────────────────────────────────────────────

export default function InstructorStudentsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  // Filters
  const [filterCourse, setFilterCourse] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Expanded student row
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // ── Fetch courses on mount ────────────────────────────────────
  useEffect(() => {
    fetch("/api/instructor/courses")
      .then((r) => r.json())
      .then((d) => setCourses(d.courses ?? []))
      .catch(() => {});
  }, []);

  // ── Fetch students when course filter or offset changes ───────
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (filterCourse) params.set("product_id", filterCourse);

      const res = await fetch(
        `/api/instructor/students/progress?${params.toString()}`
      );
      const data = await res.json();
      setStudents(data.students ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [offset, filterCourse]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Reset offset when course filter changes
  useEffect(() => {
    setOffset(0);
  }, [filterCourse]);

  // ── Toggle expanded row ────────────────────────────────────────
  const toggleExpanded = useCallback(
    (key: string) => {
      setExpandedKey((prev) => (prev === key ? null : key));
    },
    []
  );

  // ── Client-side search filtering ──────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // ── Pagination ────────────────────────────────────────────────
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  // ── Summary stats ─────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    const totalStudents = total;
    const completed = students.filter(
      (s) => s.completion_percent === 100
    ).length;
    const inProgress = students.filter(
      (s) => s.completion_percent > 0 && s.completion_percent < 100
    ).length;
    const notStarted = students.filter(
      (s) => s.completion_percent === 0
    ).length;
    return { totalStudents, completed, inProgress, notStarted };
  }, [students, total]);

  return (
    <div>
      <TopBar
        title="Tiến trình học viên"
        subtitle="Theo dõi tiến độ học tập của học viên"
      />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* ── Summary Stats ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card-dark p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Tổng học viên</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.1)" }}
              >
                <Users size={14} style={{ color: "#3b82f6" }} />
              </div>
            </div>
            <div className="text-xl font-bold text-white">
              {summaryStats.totalStudents}
            </div>
          </div>
          <div className="card-dark p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Hoàn thành</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.1)" }}
              >
                <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
              </div>
            </div>
            <div className="text-xl font-bold text-[#22c55e]">
              {summaryStats.completed}
            </div>
          </div>
          <div className="card-dark p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Đang học</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(234,179,8,0.1)" }}
              >
                <BookOpen size={14} style={{ color: "#eab308" }} />
              </div>
            </div>
            <div className="text-xl font-bold text-[#eab308]">
              {summaryStats.inProgress}
            </div>
          </div>
          <div className="card-dark p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Chưa bắt đầu</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(107,114,128,0.1)" }}
              >
                <Clock size={14} style={{ color: "#6b7280" }} />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-400">
              {summaryStats.notStarted}
            </div>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────── */}
        <div className="card-dark p-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-400 mb-1 block">
              Khoá học
            </label>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4A843] transition-colors"
            >
              <option value="">Tất cả khoá học</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-400 mb-1 block">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên hoặc email..."
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#D4A843] transition-colors"
              />
            </div>
          </div>

          <div className="text-xs text-gray-500 self-end pb-2">
            {total} học viên
          </div>
        </div>

        {/* ── Loading ────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-500" />
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────── */}
        {!loading && filteredStudents.length === 0 && (
          <div className="card-dark p-8 text-center">
            <Users size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">
              {searchQuery.trim()
                ? "Không tìm thấy học viên phù hợp."
                : "Chưa có học viên nào đăng ký khoá học."}
            </p>
          </div>
        )}

        {/* ── Student List ───────────────────────────────────────── */}
        {!loading && filteredStudents.length > 0 && (
          <div className="space-y-2">
            {filteredStudents.map((student) => {
              const key = `${student.user_id}::${student.product_id}`;
              const isExpanded = expandedKey === key;
              const pColor = progressColor(student.completion_percent);
              const pGradient = progressGradient(student.completion_percent);

              return (
                <div key={key} className="card-dark overflow-hidden">
                  {/* ── Row header ──────────────────────────────── */}
                  <button
                    onClick={() => toggleExpanded(key)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#1a1a1a] transition-colors"
                  >
                    {/* Avatar */}
                    <div className="shrink-0">
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xs font-medium text-gray-400">
                          {getInitials(student.full_name)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white truncate">
                          {student.full_name ?? "Học viên"}
                        </span>
                        {!filterCourse && student.course_title && (
                          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#D4A843]/10 text-[#D4A843] truncate max-w-[200px]">
                            {student.course_title}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden max-w-[200px]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${student.completion_percent}%`,
                              background: pGradient,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-medium shrink-0"
                          style={{ color: pColor }}
                        >
                          {student.completed_lessons}/{student.total_lessons} bài
                        </span>
                        <span
                          className="text-xs font-bold shrink-0"
                          style={{ color: pColor }}
                        >
                          {student.completion_percent}%
                        </span>
                      </div>

                      {/* Mobile: course title */}
                      {!filterCourse && student.course_title && (
                        <p className="sm:hidden text-[10px] text-[#D4A843] mt-1 truncate">
                          {student.course_title}
                        </p>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="hidden sm:block text-right shrink-0">
                      <p className="text-[10px] text-gray-500">
                        Đăng ký: {formatDateVN(student.enrolled_at)}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Hoạt động: {timeAgo(student.last_activity)}
                      </p>
                    </div>

                    {/* Chevron */}
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-500 shrink-0" />
                    ) : (
                      <ChevronDown
                        size={16}
                        className="text-gray-500 shrink-0"
                      />
                    )}
                  </button>

                  {/* ── Expanded detail ─────────────────────────── */}
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{
                      maxHeight: isExpanded ? "600px" : "0px",
                      opacity: isExpanded ? 1 : 0,
                    }}
                  >
                    <div className="px-4 pb-4 border-t border-[#2a2a2a]">
                      {/* Mobile dates */}
                      <div className="sm:hidden mt-3 flex gap-4 text-[10px] text-gray-500">
                        <span>
                          Đăng ký: {formatDateVN(student.enrolled_at)}
                        </span>
                        <span>
                          Hoạt động: {timeAgo(student.last_activity)}
                        </span>
                      </div>

                      {/* Progress detail */}
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 font-medium mb-2">
                          Chi tiết tiến trình
                        </p>

                        {/* Visual progress breakdown */}
                        <div className="bg-[#111] rounded-lg p-3 space-y-3">
                          {/* Large progress bar */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-gray-400">
                                Tiến trình tổng thể
                              </span>
                              <span
                                className="text-sm font-bold"
                                style={{ color: pColor }}
                              >
                                {student.completion_percent}%
                              </span>
                            </div>
                            <div className="h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${student.completion_percent}%`,
                                  background: pGradient,
                                }}
                              />
                            </div>
                          </div>

                          {/* Lesson count grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a]">
                              <CheckCircle2
                                size={14}
                                className="text-[#22c55e] shrink-0"
                              />
                              <div>
                                <p className="text-xs text-gray-400">
                                  Hoàn thành
                                </p>
                                <p className="text-sm font-semibold text-[#22c55e]">
                                  {student.completed_lessons} bài
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a]">
                              <Clock
                                size={14}
                                className="text-gray-500 shrink-0"
                              />
                              <div>
                                <p className="text-xs text-gray-400">
                                  Còn lại
                                </p>
                                <p className="text-sm font-semibold text-gray-300">
                                  {student.total_lessons -
                                    student.completed_lessons}{" "}
                                  bài
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a]">
                              <BookOpen
                                size={14}
                                className="text-[#D4A843] shrink-0"
                              />
                              <div>
                                <p className="text-xs text-gray-400">
                                  Tổng bài học
                                </p>
                                <p className="text-sm font-semibold text-gray-300">
                                  {student.total_lessons} bài
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Summary line */}
                      <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex items-center gap-4 text-xs text-gray-400">
                        <span>
                          Hoàn thành:{" "}
                          <strong
                            className="font-semibold"
                            style={{ color: pColor }}
                          >
                            {student.completed_lessons}/{student.total_lessons}{" "}
                            bài ({student.completion_percent}%)
                          </strong>
                        </span>
                        {student.email && (
                          <span className="text-gray-500 truncate">
                            {student.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                offset === 0
                  ? "bg-[#1a1a1a] text-gray-600 cursor-not-allowed"
                  : "bg-[#1a1a1a] text-gray-300 hover:bg-[#222]"
              }`}
            >
              Trước
            </button>
            <span className="text-xs text-gray-400">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={currentPage >= totalPages}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                currentPage >= totalPages
                  ? "bg-[#1a1a1a] text-gray-600 cursor-not-allowed"
                  : "bg-[#1a1a1a] text-gray-300 hover:bg-[#222]"
              }`}
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
