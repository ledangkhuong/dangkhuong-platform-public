"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import {
  BookOpen,
  Users,
  ClipboardCheck,
  MessageSquare,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  thumbnail: string | null;
  slug: string;
  enrollment_count: number;
}

export default function InstructorDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [coursesRes, submissionsRes, questionsRes] = await Promise.all([
          fetch("/api/instructor/courses"),
          fetch("/api/instructor/submissions?status=pending&limit=1"),
          fetch("/api/instructor/questions?status=unresolved&limit=1"),
        ]);

        const coursesData = await coursesRes.json();
        const submissionsData = await submissionsRes.json();
        const questionsData = await questionsRes.json();

        setCourses(coursesData.courses ?? []);
        setPendingCount(submissionsData.total ?? 0);
        setQuestionCount(questionsData.total ?? 0);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalStudents = courses.reduce(
    (sum, c) => sum + (c.enrollment_count ?? 0),
    0
  );

  const stats = [
    {
      label: "Khoá học",
      value: courses.length,
      icon: BookOpen,
      color: "#D4A843",
      bg: "rgba(212,168,67,0.1)",
    },
    {
      label: "Học viên",
      value: totalStudents,
      icon: Users,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.1)",
    },
    {
      label: "Bài chờ chấm",
      value: pendingCount,
      icon: ClipboardCheck,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.1)",
    },
    {
      label: "Câu hỏi mới",
      value: questionCount,
      icon: MessageSquare,
      color: "#a855f7",
      bg: "rgba(168,85,247,0.1)",
    },
  ];

  return (
    <div>
      <TopBar title="Giảng viên" subtitle="Quản lý khoá học" />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        {/* Welcome */}
        <div className="card-dark p-5">
          <h2 className="text-xl font-bold text-white mb-1">
            Xin chào Giảng viên!
          </h2>
          <p className="text-gray-400 text-sm">
            Quản lý khoá học và chấm bài học viên của bạn tại đây.
          </p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s, i) => (
                <div key={i} className="card-dark p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 font-medium">
                      {s.label}
                    </span>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: s.bg }}
                    >
                      <s.icon size={14} style={{ color: s.color }} />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Truy cập nhanh
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/instructor/submissions"
                  className="card-dark p-4 hover:bg-[#222] transition-all duration-150 group cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(245,158,11,0.1)" }}
                    >
                      <ClipboardCheck
                        size={18}
                        style={{ color: "#f59e0b" }}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-white">
                        Chấm bài học viên
                      </div>
                      <div className="text-xs text-gray-400">
                        {pendingCount} bài đang chờ
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-500 group-hover:text-[#D4A843] transition-colors"
                  />
                </Link>

                <Link
                  href="/instructor/courses"
                  className="card-dark p-4 hover:bg-[#222] transition-all duration-150 group cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(212,168,67,0.1)" }}
                    >
                      <BookOpen size={18} style={{ color: "#D4A843" }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-white">
                        Khoá học của tôi
                      </div>
                      <div className="text-xs text-gray-400">
                        {courses.length} khoá học
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-500 group-hover:text-[#D4A843] transition-colors"
                  />
                </Link>

                <Link
                  href="/instructor/students"
                  className="card-dark p-4 hover:bg-[#222] transition-all duration-150 group cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(59,130,246,0.1)" }}
                    >
                      <Users size={18} style={{ color: "#3b82f6" }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-white">
                        Tiến trình học viên
                      </div>
                      <div className="text-xs text-gray-400">
                        Theo dõi tiến độ học
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-500 group-hover:text-[#3b82f6] transition-colors"
                  />
                </Link>

                <Link
                  href="/instructor/questions"
                  className="card-dark p-4 hover:bg-[#222] transition-all duration-150 group cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(168,85,247,0.1)" }}
                    >
                      <MessageSquare size={18} style={{ color: "#a855f7" }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-white">
                        Câu hỏi học viên
                      </div>
                      <div className="text-xs text-gray-400">
                        {questionCount} câu hỏi mới
                      </div>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-gray-500 group-hover:text-[#a855f7] transition-colors"
                  />
                </Link>
              </div>
            </div>

            {/* Recent Courses */}
            {courses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Khoá học của bạn
                  </h3>
                  <Link
                    href="/instructor/courses"
                    className="text-xs text-[#D4A843] hover:underline flex items-center gap-1"
                  >
                    Xem tất cả <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="card-dark divide-y divide-[#2a2a2a]">
                  {courses.slice(0, 5).map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-3 p-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] shrink-0 overflow-hidden">
                        {course.thumbnail && (
                          <img
                            src={course.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {course.enrollment_count} học viên
                        </p>
                      </div>
                      <Link
                        href={`/instructor/submissions?product_id=${course.id}`}
                        className="text-xs text-[#D4A843] hover:underline shrink-0"
                      >
                        Xem bài nộp
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
