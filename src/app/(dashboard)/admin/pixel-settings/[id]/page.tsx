export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Activity, CheckCircle, XCircle } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import PixelConfigForm from "@/components/admin/PixelConfigForm";
import CopyInline from "@/components/admin/CopyInline";
import type { PixelConfig, PixelEventLog } from "@/types/pixel-config";

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

export default async function AdminPixelConfigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "manager", "marketing"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Load config
  const admin = await createAdminClient();
  const { data: config } = await admin
    .from("pixel_configs").select("*").eq("id", id).maybeSingle();
  if (!config) notFound();
  const typedConfig = config as PixelConfig;

  // Recent events log (best-effort)
  const { data: logs } = await admin
    .from("pixel_events_log")
    .select("*")
    .eq("config_id", id)
    .order("created_at", { ascending: false })
    .limit(20);
  const events = (logs ?? []) as PixelEventLog[];

  const successCount = events.filter((e) => e.success).length;
  const failCount = events.length - successCount;

  return (
    <div>
      <TopBar
        title={typedConfig.name}
        subtitle={`Pixel ID: ${typedConfig.pixel_id} · Slug: ${typedConfig.slug}`}
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Back nav */}
        <Link
          href="/admin/pixel-settings"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Tất cả Pixel
        </Link>

        {/* Snippet box */}
        <div
          className="p-4 rounded-2xl flex items-center gap-3"
          style={{
            background: "rgba(212,168,67,0.06)",
            border: "1px solid rgba(212,168,67,0.2)",
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-400 mb-1">Snippet để paste vào landing</div>
            <code className="text-sm text-[#D4A843] font-mono break-all">
              {`<PagePixel slug="${typedConfig.slug}" />`}
            </code>
          </div>
          <CopyInline value={`<PagePixel slug="${typedConfig.slug}" />`} label="Copy snippet" />
        </div>

        {/* Edit form */}
        <PixelConfigForm config={typedConfig} alwaysOpen />

        {/* Recent events */}
        <div className="card-dark overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid #2a2a2a" }}
          >
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-[#D4A843]" />
              <h3 className="text-sm font-semibold text-white">
                20 event CAPI gần nhất
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-400">
                <CheckCircle size={11} className="inline" /> {successCount}
              </span>
              <span className="text-red-400">
                <XCircle size={11} className="inline" /> {failCount}
              </span>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Chưa có event nào được gửi. Sau khi gắn snippet, event PageView/Lead sẽ hiển thị ở đây.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                    {["Thời gian", "Event", "Event ID", "Trạng thái", "Lỗi"].map((col) => (
                      <th
                        key={col}
                        className="text-left text-xs font-semibold text-gray-500 px-5 py-3 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr
                      key={e.id}
                      className="hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: i < events.length - 1 ? "1px solid #1f1f1f" : "none" }}
                    >
                      <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-400">
                        {formatDateTime(e.created_at)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-[#D4A843]">{e.event_name}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="font-mono text-[10px] text-gray-500">{e.event_id}</span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {e.success ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle size={11} /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-400">
                            <XCircle size={11} /> Fail
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {e.error_message ? (
                          <span className="text-red-400">{e.error_message}</span>
                        ) : (
                          <span>—</span>
                        )}
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
