import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/components/layout/TopBar";
import {
  FileText,
  Eye,
  Send,
  PenLine,
  CalendarDays,
  ExternalLink,
  Layers,
  BarChart3,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnail: string | null;
  category: string | null;
  tags: string[] | null;
  status: "draft" | "published";
  views: number;
  published_at: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminBlogPage() {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard");

  // Fetch blog posts
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  const blogPosts: BlogPost[] = posts ?? [];

  // Stats
  const totalPosts = blogPosts.length;
  const publishedCount = blogPosts.filter((p) => p.status === "published").length;
  const draftCount = blogPosts.filter((p) => p.status === "draft").length;
  const totalViews = blogPosts.reduce((sum, p) => sum + (p.views ?? 0), 0);

  const stats = [
    {
      label: "Tổng bài viết",
      value: totalPosts.toLocaleString("vi-VN"),
      icon: FileText,
      color: "#3b82f6",
      sub: "tất cả trạng thái",
    },
    {
      label: "Đã xuất bản",
      value: publishedCount.toLocaleString("vi-VN"),
      icon: Send,
      color: "#D4A843",
      sub: "đang hiển thị",
    },
    {
      label: "Bản nháp",
      value: draftCount.toLocaleString("vi-VN"),
      icon: PenLine,
      color: "#f59e0b",
      sub: "chờ hoàn thiện",
    },
    {
      label: "Tổng lượt xem",
      value: formatViews(totalViews),
      icon: BarChart3,
      color: "#8b5cf6",
      sub: "trên tất cả bài viết",
    },
  ];

  return (
    <div>
      <TopBar
        title="Quản lý Blog"
        subtitle={`${totalPosts} bài viết`}
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Create button */}
        <div className="flex justify-end">
          <Link
            href="/admin/blog/new"
            className="btn-green text-sm flex items-center gap-2"
          >
            <PenLine size={14} />
            Viết bài mới
          </Link>
        </div>
        {/* ── Stats row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: s.color + "18" }}
                >
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs font-semibold text-gray-300">{s.label}</div>
              <div className="text-[11px] text-gray-600">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Blog posts table ──────────────────────────────── */}
        <div className="card-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                  {[
                    "Bài viết",
                    "Slug",
                    "Trạng thái",
                    "Chủ đề",
                    "Lượt xem",
                    "Ngày xuất bản",
                    "Ngày tạo",
                    "",
                  ].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {blogPosts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-16 text-center text-gray-600 text-sm"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <FileText size={32} className="text-gray-700" />
                        <p>Chưa có bài viết nào.</p>
                        <p className="text-xs text-gray-700">
                          Hãy tạo bài viết đầu tiên để bắt đầu.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  blogPosts.map((post, idx) => (
                    <tr
                      key={post.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom:
                          idx < blogPosts.length - 1
                            ? "1px solid #2a2a2a"
                            : "none",
                      }}
                    >
                      {/* Title + excerpt */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate">
                            {post.title}
                          </div>
                          {post.excerpt && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {post.excerpt}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <code
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: "#1f1f1f",
                            color: "#9ca3af",
                            border: "1px solid #2a2a2a",
                          }}
                        >
                          {post.slug}
                        </code>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {post.status === "published" ? (
                          <span className="badge-green">Xuất bản</span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(107,114,128,0.1)",
                              color: "#9ca3af",
                              border: "1px solid rgba(107,114,128,0.25)",
                            }}
                          >
                            Nháp
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {post.category ? (
                          <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Layers size={12} className="text-gray-600" />
                            {post.category}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-700">—</span>
                        )}
                      </td>

                      {/* Views */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          <Eye size={13} className="text-gray-600" />
                          {formatViews(post.views ?? 0)}
                        </span>
                      </td>

                      {/* Published at */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {post.published_at ? (
                          <span className="flex items-center gap-1.5 text-xs text-gray-400">
                            <CalendarDays size={12} className="text-gray-600" />
                            {formatDate(post.published_at)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-700">—</span>
                        )}
                      </td>

                      {/* Created at */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {formatDateTime(post.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/blog/${post.id}/edit`}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                            style={{
                              background: "rgba(59,130,246,0.1)",
                              color: "#3b82f6",
                              border: "1px solid rgba(59,130,246,0.25)",
                            }}
                          >
                            <PenLine size={11} />
                            Sửa
                          </Link>
                          <Link
                            href={`/blog/${post.slug}`}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                            style={{
                              background: "rgba(212,168,67,0.1)",
                              color: "#D4A843",
                              border: "1px solid rgba(212,168,67,0.25)",
                            }}
                          >
                            <ExternalLink size={11} />
                            Xem
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Summary footer ───────────────────────────────── */}
        {blogPosts.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              Hiển thị{" "}
              <span className="text-white font-semibold">{totalPosts}</span> bài
              viết
              {publishedCount > 0 && (
                <>
                  {" "}
                  &middot;{" "}
                  <span className="text-amber-500 font-semibold">
                    {publishedCount}
                  </span>{" "}
                  xuất bản
                </>
              )}
              {draftCount > 0 && (
                <>
                  {" "}
                  &middot;{" "}
                  <span className="text-yellow-500 font-semibold">
                    {draftCount}
                  </span>{" "}
                  nháp
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
