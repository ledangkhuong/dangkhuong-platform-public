"use client";

import { useState } from "react";
import {
  Users,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

interface CourseOption {
  id: string;
  title: string;
  price: number;
}

interface BulkResult {
  total: number;
  granted: string[];
  alreadyEnrolled: string[];
  notFound: string[];
  failed: string[];
}

export default function BulkEnrollForm({
  courses,
}: {
  courses: CourseOption[];
}) {
  const [emailText, setEmailText] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState("");

  // Parse emails from textarea
  const parseEmails = (): string[] => {
    return emailText
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes("@"));
  };

  const emailCount = parseEmails().length;

  const toggleCourse = (id: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCourses = () => {
    if (selectedCourses.size === courses.length) {
      setSelectedCourses(new Set());
    } else {
      setSelectedCourses(new Set(courses.map((c) => c.id)));
    }
  };

  const handleSubmit = async () => {
    const emails = parseEmails();
    if (emails.length === 0 || selectedCourses.size === 0) return;

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/admin/enrollments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails,
          product_ids: Array.from(selectedCourses),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResult(data);
        // Clear form on success (only emails, keep course selection)
        if (data.granted.length > 0) {
          setEmailText("");
        }
      } else {
        setError(data.error || "Có lỗi xảy ra");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-dark p-6">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(59,130,246,0.12)" }}
        >
          <Users size={17} className="text-[#3b82f6]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">
            Cấp quyền hàng loạt
          </h2>
          <p className="text-xs text-gray-500">
            Paste danh sách email để cấp khoá học cho nhiều người cùng lúc
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Email textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-400 font-medium">
              Danh sách email
            </label>
            {emailCount > 0 && (
              <span className="text-xs text-blue-400 font-medium">
                {emailCount} email
              </span>
            )}
          </div>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder={"email1@gmail.com\nemail2@gmail.com\nemail3@gmail.com\n\nHoặc paste từ Excel (mỗi email 1 dòng, hoặc phân cách bằng dấu phẩy)"}
            className="input-dark w-full px-3 py-2.5 rounded-lg text-sm resize-y font-mono"
            rows={5}
          />
          <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
            <Info size={10} />
            Hỗ trợ phân cách bằng xuống dòng, dấu phẩy, hoặc chấm phẩy. Copy từ Excel cũng được.
          </p>
        </div>

        {/* Course selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 font-medium">
              Chọn khoá học{" "}
              <span className="text-gray-600">(có thể chọn nhiều)</span>
            </label>
            <button
              type="button"
              onClick={selectAllCourses}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {selectedCourses.size === courses.length
                ? "Bỏ chọn tất cả"
                : "Chọn tất cả"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {courses.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group transition-all"
                style={{
                  backgroundColor: selectedCourses.has(c.id)
                    ? "rgba(59,130,246,0.06)"
                    : undefined,
                  border: selectedCourses.has(c.id)
                    ? "1px solid rgba(59,130,246,0.25)"
                    : "1px solid #2a2a2a",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedCourses.has(c.id)}
                  onChange={() => toggleCourse(c.id)}
                  className="w-4 h-4 rounded border-gray-600 bg-[#1a1a1a] accent-[#3b82f6]"
                />
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate flex-1">
                  {c.title}
                </span>
                {c.price === 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                    style={{
                      background: "rgba(107,114,128,0.15)",
                      color: "#9ca3af",
                    }}
                  >
                    Miễn phí
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444",
            }}
          >
            <XCircle size={15} />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className="p-4 rounded-xl space-y-3"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <h4 className="text-sm font-semibold text-white">
              Kết quả cấp quyền
            </h4>

            {/* Granted */}
            {result.granted.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2
                  size={15}
                  className="text-green-400 mt-0.5 shrink-0"
                />
                <div>
                  <span className="text-green-400 font-medium">
                    {result.granted.length} email thành công
                  </span>
                  <p className="text-gray-500 text-xs mt-0.5 break-all">
                    {result.granted.join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* Already enrolled */}
            {result.alreadyEnrolled.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle
                  size={15}
                  className="text-amber-400 mt-0.5 shrink-0"
                />
                <div>
                  <span className="text-amber-400 font-medium">
                    {result.alreadyEnrolled.length} đã có khoá học
                  </span>
                  <p className="text-gray-500 text-xs mt-0.5 break-all">
                    {result.alreadyEnrolled.join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* Not found */}
            {result.notFound.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <XCircle
                  size={15}
                  className="text-red-400 mt-0.5 shrink-0"
                />
                <div>
                  <span className="text-red-400 font-medium">
                    {result.notFound.length} không tìm thấy tài khoản
                  </span>
                  <p className="text-gray-500 text-xs mt-0.5 break-all">
                    {result.notFound.join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* Failed */}
            {result.failed.length > 0 && (
              <div className="flex items-start gap-2 text-sm">
                <XCircle
                  size={15}
                  className="text-red-400 mt-0.5 shrink-0"
                />
                <div>
                  <span className="text-red-400 font-medium">
                    {result.failed.length} lỗi
                  </span>
                  <p className="text-gray-500 text-xs mt-0.5 break-all">
                    {result.failed.join(", ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || emailCount === 0 || selectedCourses.size === 0}
          className="btn-green py-2.5 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Upload size={15} />
          )}
          {loading
            ? "Đang xử lý..."
            : `Cấp quyền cho ${emailCount} email`}
        </button>
      </div>
    </div>
  );
}
