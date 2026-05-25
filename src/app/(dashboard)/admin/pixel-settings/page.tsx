export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
  Pencil,
  Globe,
  ArrowRight,
} from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import { listPixelConfigs } from "@/lib/pixel-config";
import PixelConfigForm from "@/components/admin/PixelConfigForm";
import DeletePixelConfigButton from "@/components/admin/DeletePixelConfigButton";
import CopyInline from "@/components/admin/CopyInline";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export default async function AdminPixelSettingsPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "marketing"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const configs = await listPixelConfigs();

  // Stats
  const total = configs.length;
  const active = configs.filter((c) => c.is_active).length;
  const withCapi = configs.filter((c) => c.capi_access_token).length;

  return (
    <div>
      <TopBar
        title="Pixel & CAPI"
        subtitle="Quản lý Facebook Pixel + Conversions API theo từng landing page"
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <Activity size={17} className="text-[#3b82f6]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tổng cấu hình</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)" }}
              >
                <CheckCircle size={17} className="text-[#22c55e]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{active}</div>
            <div className="text-xs text-gray-500 mt-0.5">Đang bật</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.12)" }}
              >
                <Shield size={17} className="text-[#D4A843]" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{withCapi}</div>
            <div className="text-xs text-gray-500 mt-0.5">Có CAPI server-side</div>
          </div>
        </div>

        {/* ── Quick action: gắn Pixel vào landing ── */}
        <Link
          href="/admin/pixel-settings/pages"
          className="block p-5 rounded-2xl transition-all hover:scale-[1.005]"
          style={{
            background: "linear-gradient(135deg, rgba(212,168,67,0.08), rgba(212,168,67,0.02))",
            border: "1px solid rgba(212,168,67,0.25)",
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: "rgba(212,168,67,0.15)" }}>
              <Globe size={22} className="text-[#D4A843]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-white">
                Gắn Pixel vào landing
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Cho marketing tick chọn pixel cho từng landing — không cần đụng code,
                hiệu lực ngay sau khi Lưu.
              </p>
            </div>
            <ArrowRight size={20} className="text-[#D4A843] flex-shrink-0" />
          </div>
        </Link>

        {/* ── Hướng dẫn nhanh ── */}
        <div
          className="p-5 rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(59,130,246,0.01))",
            border: "1px solid rgba(59,130,246,0.2)",
          }}
        >
          <h3 className="text-sm font-semibold text-[#3b82f6] mb-2">
            Quy trình tổng quát
          </h3>
          <ol className="text-sm text-gray-300 space-y-1.5 list-decimal pl-5">
            <li>
              <strong>Tạo cấu hình Pixel</strong> ở dưới (Pixel ID + CAPI Token từ
              Events Manager)
            </li>
            <li>
              Vào{" "}
              <Link href="/admin/pixel-settings/pages" className="text-[#D4A843] hover:underline">
                Gắn Pixel vào landing
              </Link>{" "}
              → <strong>tick</strong> chọn pixel vừa tạo cho landing tương ứng → <strong>Lưu</strong>
            </li>
            <li>
              Test ở Events Manager → Test Events (điền &ldquo;Test Event Code&rdquo; ở
              cấu hình Pixel khi cần)
            </li>
          </ol>
        </div>

        {/* ── Create form ── */}
        <PixelConfigForm />

        {/* ── List ── */}
        <div className="card-dark overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <span className="text-xs text-gray-500">
              Hiển thị <span className="text-white font-medium">{configs.length}</span> cấu hình
            </span>
          </div>

          {configs.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">
              Chưa có cấu hình nào. Nhấn &ldquo;Tạo cấu hình Pixel&rdquo; ở trên để bắt đầu.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Slug & Tên", "Pixel ID", "CAPI", "Trạng thái", "Cập nhật", ""].map((col, i) => (
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
                  {configs.map((c, idx) => (
                    <tr
                      key={c.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{
                        borderBottom: idx < configs.length - 1 ? "1px solid #1f1f1f" : "none",
                      }}
                    >
                      {/* Slug & Name */}
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-sm text-[#D4A843] font-semibold">{c.slug}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{c.name}</div>
                      </td>

                      {/* Pixel ID */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-300">{c.pixel_id}</span>
                      </td>

                      {/* CAPI status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {c.capi_access_token ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <Shield size={12} /> Có token
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <ShieldOff size={12} /> Pixel-only
                          </span>
                        )}
                        {c.test_event_code && (
                          <div className="text-[10px] text-orange-400 mt-0.5">
                            Test code: {c.test_event_code}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {c.is_active ? (
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

                      {/* Updated */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{formatDateTime(c.updated_at)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/pixel-settings/${c.id}`}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-gray-300 hover:text-white transition-colors"
                            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                          >
                            <Pencil size={11} />
                            Sửa
                          </Link>
                          <CopyInline
                            value={`<PagePixel slug="${c.slug}" />`}
                            label="Copy"
                          />
                          <DeletePixelConfigButton configId={c.id} configName={c.name} />
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
