export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Globe,
  CheckCircle,
  XCircle,
  ExternalLink,
  Pencil,
  Activity,
  ArrowLeft,
} from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import CreateLandingForm from "@/components/admin/CreateLandingForm";
import DeleteLandingButton from "@/components/admin/DeleteLandingButton";
import type { LandingPage } from "@/types/pixel-config";

interface LandingRow extends LandingPage {
  pixel_count: number;
}

export default async function AdminLandingPagesPage() {
  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "marketing"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Load all landings with pixel counts
  const admin = await createAdminClient();
  const { data: raw } = await admin
    .from("landing_pages")
    .select(`*, landing_page_pixels (pixel_config_id)`)
    .order("pathname", { ascending: true });

  const rows: LandingRow[] = (raw ?? []).map((r) => {
    const row = r as unknown as LandingPage & { landing_page_pixels?: unknown[] };
    const { landing_page_pixels, ...rest } = row;
    return {
      ...rest,
      pixel_count: Array.isArray(landing_page_pixels) ? landing_page_pixels.length : 0,
    };
  });

  const total = rows.length;
  const active = rows.filter((r) => r.is_active).length;
  const withPixel = rows.filter((r) => r.pixel_count > 0).length;
  const withoutPixel = total - withPixel;

  return (
    <div>
      <TopBar
        title="Landing Pages"
        subtitle="Gắn Pixel & CAPI vào từng trang — không cần đụng code"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Back to Pixel & CAPI */}
        <Link
          href="/admin/pixel-settings"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Quay lại Pixel & CAPI
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: "rgba(59,130,246,0.12)" }}>
                <Globe size={17} className="text-[#3b82f6]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tổng landing</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: "rgba(34,197,94,0.12)" }}>
                <CheckCircle size={17} className="text-[#22c55e]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{active}</div>
            <div className="text-xs text-gray-500 mt-0.5">Đang bật</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: "rgba(212,168,67,0.12)" }}>
                <Activity size={17} className="text-[#D4A843]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{withPixel}</div>
            <div className="text-xs text-gray-500 mt-0.5">Có gắn Pixel</div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ background: "rgba(239,68,68,0.12)" }}>
                <XCircle size={17} className="text-[#ef4444]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{withoutPixel}</div>
            <div className="text-xs text-gray-500 mt-0.5">Chưa có Pixel</div>
          </div>
        </div>

        {/* Help text */}
        <div
          className="p-4 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(212,168,67,0.06), rgba(212,168,67,0.02))",
            border: "1px solid rgba(212,168,67,0.2)",
          }}
        >
          <p className="text-sm text-gray-300">
            💡 Marketing chỉ cần <strong className="text-[#D4A843]">tick chọn Pixel</strong> cho
            từng landing → Pixel + CAPI tự động kích hoạt sau khi Lưu, không cần dev deploy.
          </p>
        </div>

        {/* Create form */}
        <CreateLandingForm />

        {/* List */}
        <div className="card-dark overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <span className="text-xs text-gray-500">
              Hiển thị <span className="text-white font-medium">{rows.length}</span> landing
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              Chưa có landing nào. Bấm &ldquo;Thêm landing page&rdquo; ở trên để bắt đầu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Pathname & Tên", "Pixel gắn", "Trạng thái", ""].map((col, i) => (
                      <th
                        key={col || `col-${i}`}
                        className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{
                        borderBottom: idx < rows.length - 1 ? "1px solid #1f1f1f" : "none",
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm text-[#D4A843] font-semibold">
                            {r.pathname}
                          </code>
                          <a
                            href={r.pathname}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-white"
                            title="Mở trang"
                          >
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{r.name}</div>
                        {r.description && (
                          <div className="text-[11px] text-gray-600 mt-0.5">{r.description}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {r.pixel_count > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(212,168,67,0.1)",
                              color: "#D4A843",
                              border: "1px solid rgba(212,168,67,0.25)",
                            }}
                          >
                            <Activity size={11} /> {r.pixel_count} pixel
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">— Chưa gắn —</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {r.is_active ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(34,197,94,0.1)",
                              color: "#22c55e",
                              border: "1px solid rgba(34,197,94,0.2)",
                            }}
                          >
                            <CheckCircle size={11} /> Hoạt động
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              background: "rgba(107,114,128,0.1)",
                              color: "#6b7280",
                              border: "1px solid rgba(107,114,128,0.2)",
                            }}
                          >
                            <XCircle size={11} /> Tắt
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/pixel-settings/pages/${r.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-black transition-colors"
                            style={{
                              background: "linear-gradient(135deg, #D4A843, #b8922e)",
                            }}
                          >
                            <Pencil size={11} />
                            Gắn pixel
                          </Link>
                          <DeleteLandingButton landingId={r.id} pathname={r.pathname} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
