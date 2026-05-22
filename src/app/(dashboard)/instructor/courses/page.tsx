"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import { Users, Loader2, BookOpen } from "lucide-react";

interface Course {
  id: string;
  title: string;
  thumbnail: string | null;
  slug: string;
  price: number | null;
  sale_price: number | null;
  enrollment_count: number;
  created_at: string;
}

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/instructor/courses")
      .then((r) => r.json())
      .then((d) => {
        setCourses(d.courses ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <TopBar
        title="Khoá học của tôi"
        subtitle="Danh sách khoá học bạn phụ trách"
      />

      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-gray-500" />
          </div>
        )}

        {/* Empty */}
        {!loading && courses.length === 0 && (
          <div className="card-dark p-8 text-center">
            <BookOpen size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              Bạn chưa được gán khoá học nào.
            </p>
          </div>
        )}

        {/* Course grid */}
        {!loading && courses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="card-dark overflow-hidden hover:bg-[#1a1a1a] transition-colors group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-[#1a1a1a] relative overflow-hidden">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={32} className="text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white mb-2 line-clamp-2 leading-snug">
                    {course.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <Users size={12} className="text-[#D4A843]" />
                    <span>{course.enrollment_count} học viên</span>
                  </div>

                  <Link
                    href={`/instructor/submissions?product_id=${course.id}`}
                    className="btn-green text-xs py-1.5 px-3 inline-flex items-center gap-1.5 w-full justify-center"
                  >
                    Xem bài nộp
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
