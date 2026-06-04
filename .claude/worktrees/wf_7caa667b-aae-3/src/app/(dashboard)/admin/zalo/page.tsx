export const dynamic = "force-dynamic";

import TopBar from "@/components/layout/TopBar";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isZaloOAConfigured } from "@/lib/zalo-oa";
import {
  CheckCircle, XCircle, Users, MessageCircle, Send, Activity,
} from "lucide-react";
import ZaloTestForm from "@/components/admin/ZaloTestForm";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminZaloPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const admin = await createAdminClient();
  const configured = isZaloOAConfigured();

  // Count users with linked Zalo accounts
  const { count: linkedCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("zalo_user_id", "is", null);

  // Count total users for comparison
  const { count: totalUsers } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  // Get recent webhook events (if table exists)
  let recentEvents: Array<{
    id: string;
    event_name: string;
    zalo_user_id: string;
    created_at: string;
  }> = [];
  try {
    const { data } = await admin
      .from("zalo_webhook_events")
      .select("id, event_name, zalo_user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    recentEvents = (data || []) as typeof recentEvents;
  } catch {
    // Table may not exist yet
  }

  // Get admin's own zalo_user_id for test messaging
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("zalo_user_id")
    .eq("id", user.id)
    .single();

  const stats = [
    {
      label: "Trang thai ket noi",
      value: configured ? "Da ket noi" : "Chua cau hinh",
      icon: configured ? CheckCircle : XCircle,
      color: configured ? "#22c55e" : "#ef4444",
      bg: configured ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
    },
    {
      label: "Tai khoan lien ket Zalo",
      value: `${linkedCount || 0} / ${totalUsers || 0}`,
      icon: Users,
      color: "#D4A843",
      bg: "rgba(212,168,67,0.1)",
    },
    {
      label: "Su kien webhook",
      value: String(recentEvents.length),
      icon: Activity,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.1)",
    },
  ];

  const eventLabels: Record<string, { label: string; color: string }> = {
    follow: { label: "Theo doi", color: "#22c55e" },
    unfollow: { label: "Bo theo doi", color: "#ef4444" },
    user_send_text: { label: "Tin nhan", color: "#3b82f6" },
    unknown: { label: "Khac", color: "#6b7280" },
  };

  return (
    <div>
      <TopBar title="Zalo OA" subtitle="Quan ly ket noi va thong bao Zalo Official Account" />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="card-dark p-5 flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: s.bg }}
              >
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div>
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-lg font-bold text-white">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Configuration info */}
        <div className="card-dark p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle size={16} className="text-[#D4A843]" />
            Cau hinh Zalo OA
          </h3>
          {configured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-[#22c55e]">
                <CheckCircle size={14} />
                <span>ZALO_OA_ACCESS_TOKEN da duoc cau hinh</span>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Webhook URL: <code className="text-gray-400">https://dangkhuong.com/api/zalo/webhook</code></p>
                <p>Cau hinh tai <a href="https://oa.zalo.me" target="_blank" rel="noopener noreferrer" className="text-[#D4A843] hover:underline">Zalo OA Dashboard</a></p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-[#ef4444]">
                <XCircle size={14} />
                <span>Chua cau hinh Zalo OA</span>
              </div>
              <div className="text-xs text-gray-500 space-y-2">
                <p>De kich hoat thong bao Zalo, can thiet lap cac bien moi truong:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li><code>ZALO_OA_ACCESS_TOKEN</code> - Access token tu Zalo OA Dashboard</li>
                  <li><code>ZALO_OA_APP_ID</code> - App ID</li>
                  <li><code>ZALO_OA_SECRET_KEY</code> - Secret key de xac thuc webhook</li>
                  <li><code>ZALO_OA_REFRESH_TOKEN</code> - Refresh token</li>
                </ul>
                <p>Webhook URL: <code className="text-gray-400">https://dangkhuong.com/api/zalo/webhook</code></p>
              </div>
            </div>
          )}
        </div>

        {/* Test message */}
        {configured && (
          <div className="card-dark p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Send size={16} className="text-[#D4A843]" />
              Gui tin nhan thu
            </h3>
            {adminProfile?.zalo_user_id ? (
              <ZaloTestForm adminZaloId={adminProfile.zalo_user_id} />
            ) : (
              <div className="text-sm text-gray-400">
                <p>Tai khoan admin chua lien ket Zalo. Hay theo doi OA bang tai khoan Zalo cua ban de lien ket tu dong.</p>
              </div>
            )}
          </div>
        )}

        {/* SQL Migration info */}
        <div className="card-dark p-6">
          <h3 className="font-semibold text-white mb-4">SQL Migration</h3>
          <div className="text-xs text-gray-500 space-y-2">
            <p>Chay lenh SQL sau de them cot zalo_user_id vao bang profiles:</p>
            <pre className="p-3 rounded-lg text-gray-300 overflow-x-auto text-[11px]" style={{ background: "#1a1a1a" }}>
{`-- Add zalo_user_id to profiles for linking Zalo accounts
ALTER TABLE profiles ADD COLUMN zalo_user_id TEXT DEFAULT NULL;
CREATE INDEX idx_profiles_zalo ON profiles(zalo_user_id) WHERE zalo_user_id IS NOT NULL;

-- Optional: Table for logging webhook events
CREATE TABLE IF NOT EXISTS zalo_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  zalo_user_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_zalo_events_created ON zalo_webhook_events(created_at DESC);`}
            </pre>
          </div>
        </div>

        {/* Recent webhook events */}
        {recentEvents.length > 0 && (
          <div className="card-dark p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Activity size={16} className="text-[#D4A843]" />
              Su kien webhook gan day
            </h3>
            <div className="space-y-2">
              {recentEvents.map((e) => {
                const config = eventLabels[e.event_name] || eventLabels.unknown;
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold"
                        style={{ background: `${config.color}20`, color: config.color }}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{e.zalo_user_id}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(e.created_at).toLocaleString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                        hour: "2-digit", minute: "2-digit", hour12: false,
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
