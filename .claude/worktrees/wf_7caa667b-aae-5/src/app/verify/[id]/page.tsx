import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { Award, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

// ─── Metadata ────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Xác minh chứng chỉ — Đăng Khương Academy",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateCertificateId(userId: string, productId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${productId}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const certIdParam = id.toUpperCase();

  const admin = await createAdminClient();

  // Query all completed enrollments with profile and product info
  const { data: enrollments } = await admin
    .from("enrollments")
    .select(
      "user_id, product_id, created_at, profiles(full_name), products(title)"
    )
    .eq("completed", true);

  // Find the enrollment matching the certificate ID
  type EnrollmentRow = {
    user_id: string;
    product_id: string;
    created_at: string;
    profiles: { full_name: string } | null;
    products: { title: string } | null;
  };

  let matched: EnrollmentRow | null = null;

  for (const enrollment of (enrollments ?? []) as unknown as EnrollmentRow[]) {
    const computedId = generateCertificateId(
      enrollment.user_id,
      enrollment.product_id
    );
    if (computedId === certIdParam) {
      matched = enrollment;
      break;
    }
  }

  // ── Not found ──────────────────────────────────────────────────────────────

  if (!matched) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "#0a0a0a" }}
      >
        <div className="card-dark p-8 sm:p-10 max-w-md w-full text-center space-y-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "2px solid rgba(239,68,68,0.3)",
            }}
          >
            <XCircle size={32} className="text-red-400" />
          </div>

          <h1 className="text-xl font-bold text-white">
            Không tìm thấy chứng chỉ ❌
          </h1>

          <p className="text-gray-400 text-sm leading-relaxed">
            Mã chứng chỉ <span className="font-mono text-white">{certIdParam}</span>{" "}
            không tồn tại hoặc không hợp lệ. Vui lòng kiểm tra lại mã chứng chỉ.
          </p>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#D4A843" }}
          >
            <ExternalLink size={14} />
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // ── Found ──────────────────────────────────────────────────────────────────

  const studentName =
    matched.profiles?.full_name || "Học viên";
  const courseName = matched.products?.title || "Khoá học";
  const completionDate = formatDate(matched.created_at);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#0a0a0a" }}
    >
      <div className="card-dark p-8 sm:p-10 max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: "rgba(212,168,67,0.12)",
              border: "2px solid rgba(212,168,67,0.3)",
            }}
          >
            <Award size={32} style={{ color: "#D4A843" }} />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-white">
              Chứng chỉ hợp lệ ✅
            </h1>
            <p className="text-gray-400 text-sm">
              Chứng chỉ này đã được xác minh thành công
            </p>
          </div>
        </div>

        {/* Divider */}
        <div
          className="border-t"
          style={{ borderColor: "rgba(212,168,67,0.2)" }}
        />

        {/* Certificate details */}
        <div className="space-y-4">
          <DetailRow label="Học viên" value={studentName} />
          <DetailRow label="Khoá học" value={courseName} />
          <DetailRow label="Ngày hoàn thành" value={completionDate} />
          <DetailRow label="Mã chứng chỉ" value={certIdParam} mono />
        </div>

        {/* Divider */}
        <div
          className="border-t"
          style={{ borderColor: "rgba(212,168,67,0.2)" }}
        />

        {/* Verification badge */}
        <div
          className="flex items-center gap-3 p-4 rounded-lg"
          style={{ background: "rgba(34,197,94,0.08)" }}
        >
          <CheckCircle size={20} className="text-green-400 shrink-0" />
          <p className="text-sm text-green-300">
            Chứng chỉ này được cấp bởi Đăng Khương Academy và đã được xác minh
            là hợp lệ.
          </p>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#D4A843" }}
          >
            <ExternalLink size={14} />
            Về trang chủ Đăng Khương Academy
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Row Component ───────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0">
      <span className="text-gray-500 text-sm sm:w-40 shrink-0">{label}</span>
      <span
        className={`text-white text-sm font-medium ${
          mono ? "font-mono tracking-wider" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
