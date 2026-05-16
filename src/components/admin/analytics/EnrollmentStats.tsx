"use client";

import { BookOpen, GraduationCap, Users } from "lucide-react";

interface EnrollmentStatsProps {
  totalEnrollments: number;
  completedEnrollments: number;
  activeEnrollments: number;
  topCourses: Array<{
    title: string;
    enrollments: number;
    completionRate: number;
  }>;
  loading?: boolean;
}

function Skeleton() {
  return (
    <div className="card-dark p-5 animate-pulse">
      {/* Header */}
      <div className="w-36 h-5 rounded bg-white/10 mb-5" />

      {/* Mini stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center">
            <div className="w-12 h-6 rounded bg-white/10 mx-auto mb-1" />
            <div className="w-16 h-3 rounded bg-white/10 mx-auto" />
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full h-3 rounded-full bg-white/10 mb-5" />

      {/* Course list */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="w-40 h-3 rounded bg-white/10 mb-2" />
            <div className="w-full h-2 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EnrollmentStats({
  totalEnrollments,
  completedEnrollments,
  activeEnrollments,
  topCourses,
  loading = false,
}: EnrollmentStatsProps) {
  if (loading) {
    return <Skeleton />;
  }

  const completionRate =
    totalEnrollments > 0
      ? Math.round((completedEnrollments / totalEnrollments) * 100)
      : 0;

  return (
    <div className="card-dark p-5">
      {/* Title */}
      <h3 className="text-white font-semibold text-base mb-5">
        Thống kê ghi danh
      </h3>

      {/* Mini stat numbers */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users size={14} className="text-blue-400" />
            <span className="text-xl font-bold text-white">
              {totalEnrollments.toLocaleString("vi-VN")}
            </span>
          </div>
          <p className="text-xs text-gray-400">Tổng ghi danh</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <BookOpen size={14} className="text-yellow-400" />
            <span className="text-xl font-bold text-white">
              {activeEnrollments.toLocaleString("vi-VN")}
            </span>
          </div>
          <p className="text-xs text-gray-400">Đang học</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <GraduationCap size={14} className="text-emerald-400" />
            <span className="text-xl font-bold text-white">
              {completedEnrollments.toLocaleString("vi-VN")}
            </span>
          </div>
          <p className="text-xs text-gray-400">Hoàn thành</p>
        </div>
      </div>

      {/* Overall completion progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Tỷ lệ hoàn thành</span>
          <span className="text-xs font-medium text-emerald-400">
            {completionRate}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${completionRate}%`,
              backgroundColor: "#10b981",
            }}
          />
        </div>
      </div>

      {/* Top courses list */}
      {topCourses.length > 0 && (
        <div>
          <p className="text-sm text-gray-400 mb-3">Khóa học nổi bật</p>
          <div className="space-y-3">
            {topCourses.map((course) => (
              <div key={course.title}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white truncate max-w-[70%]">
                    {course.title}
                  </span>
                  <span className="text-xs text-gray-400">
                    {course.enrollments} học viên
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full"
                  style={{ backgroundColor: "#2a2a2a" }}
                >
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${course.completionRate}%`,
                      backgroundColor: "#10b981",
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {course.completionRate}% hoàn thành
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
