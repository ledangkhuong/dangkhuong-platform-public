import { redirect, notFound } from "next/navigation";
import crypto from "crypto";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import CertificateView from "@/components/certificate/CertificateView";
import { ArrowLeft, Award } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

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

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("title")
    .eq("slug", slug)
    .single();

  return {
    title: product
      ? `Chứng chỉ - ${product.title}`
      : "Chứng chỉ hoàn thành",
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch product
  const { data: product } = await supabase
    .from("products")
    .select("id, slug, title, price")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!product) notFound();

  // Check access: enrollment or admin
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const hasAccess = profile?.role === "admin" || !!enrollment || product.price === 0;

  if (!hasAccess) {
    redirect(`/courses/${slug}`);
  }

  // Fetch all lessons for this course
  const { data: chapters } = await supabase
    .from("chapters")
    .select("lessons(id)")
    .eq("product_id", product.id);

  const allLessonIds = (chapters ?? []).flatMap(
    (ch) => ((ch.lessons as { id: string }[]) ?? []).map((l) => l.id)
  );
  const totalLessons = allLessonIds.length;

  // Fetch user progress
  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id)
    .eq("product_id", product.id);

  const completedCount = (progressRows ?? []).filter((p) => p.completed).length;
  const isComplete = totalLessons > 0 && completedCount >= totalLessons;

  if (!isComplete) {
    redirect(`/courses/${slug}`);
  }

  const studentName = profile?.full_name || user.email?.split("@")[0] || "Học viên";

  // Find the latest completion date
  const lastCompleted = (progressRows ?? [])
    .filter((p) => p.completed)
    .map((p) => p as unknown as { completed: boolean; updated_at?: string })
    .reduce((latest, p) => {
      const pDate = (p as Record<string, unknown>).updated_at as string | undefined;
      return pDate && pDate > (latest || "") ? pDate : latest;
    }, "" as string);

  const completionDate = lastCompleted
    ? formatDate(lastCompleted)
    : formatDate(new Date().toISOString());

  const certificateId = generateCertificateId(user.id, product.id);

  return (
    <div>
      <TopBar title="Chứng chỉ hoàn thành" subtitle={product.title} />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Back link */}
        <Link
          href={`/courses/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#D4A843] transition-colors"
        >
          <ArrowLeft size={14} />
          Quay lại khoá học
        </Link>

        {/* Congrats header */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: "rgba(212,168,67,0.12)",
              border: "2px solid rgba(212,168,67,0.3)",
            }}
          >
            <Award size={28} className="text-[#D4A843]" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Chúc mừng bạn đã hoàn thành khoá học!
          </h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Bạn đã hoàn thành {totalLessons} bài học. Đây là chứng chỉ của bạn — hãy tải về và chia sẻ!
          </p>
        </div>

        {/* Certificate */}
        <CertificateView
          studentName={studentName}
          courseName={product.title}
          completionDate={completionDate}
          certificateId={certificateId}
          totalLessons={totalLessons}
        />
      </div>
    </div>
  );
}
