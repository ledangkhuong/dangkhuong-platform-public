import TopBar from "@/components/layout/TopBar";
import EmailNav from "@/components/email/EmailNav";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Mail, Users, Send, Eye, MousePointer, TrendingUp, Plus, Clock,
  CheckCircle, UserMinus, UserCheck, Inbox, AlertTriangle, ArrowRight,
  Workflow,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Bản nháp", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  scheduled: { label: "Đã lên lịch", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  sending: { label: "Đang gửi", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  sent: { label: "Đã gửi", color: "#D4A843", bg: "rgba(212,168,67,0.1)" },
  paused: { label: "Tạm dừng", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

export default async function EmailPage() {
  const supabase = await createClient();

  // Fetch subscriber counts by status
  const [
    { count: totalSubscribers },
    { count: activeSubscribers },
    { count: unsubscribedCount },
    { count: bouncedCount },
    { count: activeAutomations },
  ] = await Promise.all([
    supabase.from("subscribers").select("*", { count: "exact", head: true }),
    supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "unsubscribed"),
    supabase.from("subscribers").select("*", { count: "exact", head: true }).eq("status", "bounced"),
    supabase.from("email_automations").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const total = totalSubscribers ?? 0;
  const active = activeSubscribers ?? 0;
  const automations = activeAutomations ?? 0;
  const unsubscribed = unsubscribedCount ?? 0;
  const bounced = bouncedCount ?? 0;
  const bounceRate = total > 0 ? ((bounced / total) * 100).toFixed(1) : "0.0";

  // Fetch campaigns ordered by created_at desc
  const { data: campaigns } = await supabase
    .from("email_campaigns")
    .select("id, name, subject, status, scheduled_at, sent_at, sent_count, open_count, click_count, total_recipients, created_at")
    .order("created_at", { ascending: false });

  const campaignList = campaigns ?? [];

  // Get recent 5 campaigns
  const recentCampaigns = campaignList.slice(0, 5);

  // Compute aggregate email stats — use total_recipients for accurate rates
  const totalRecipients = campaignList.reduce((sum, c) => sum + (c.total_recipients ?? c.sent_count ?? 0), 0);
  const totalSent = totalRecipients; // Display the actual unique recipients, not inflated sent_count
  const totalOpened = campaignList.reduce((sum, c) => sum + (c.open_count ?? 0), 0);
  const totalClicked = campaignList.reduce((sum, c) => sum + (c.click_count ?? 0), 0);
  const avgOpenRate = totalRecipients > 0 ? ((totalOpened / totalRecipients) * 100).toFixed(1) : "0.0";
  const avgClickRate = totalRecipients > 0 ? ((totalClicked / totalRecipients) * 100).toFixed(1) : "0.0";

  const stats = [
    { label: "Tổng subscribers", value: total.toLocaleString("vi-VN"), sub: `${active} đang hoạt động`, icon: Users, color: "#D4A843" },
    { label: "Email đã gửi", value: totalSent.toLocaleString("vi-VN"), sub: `${campaignList.length} campaigns`, icon: Send, color: "#3b82f6" },
    { label: "Open rate TB", value: `${avgOpenRate}%`, sub: `${totalOpened.toLocaleString("vi-VN")} lượt mở`, icon: Eye, color: "#f59e0b" },
    { label: "Click rate TB", value: `${avgClickRate}%`, sub: `${totalClicked.toLocaleString("vi-VN")} lượt click`, icon: MousePointer, color: "#8b5cf6" },
    { label: "Active Automations", value: automations.toLocaleString("vi-VN"), sub: "workflows đang chạy", icon: Workflow, color: "#14b8a6" },
  ];

  return (
    <div>
      <TopBar title="Email Marketing" subtitle="Quản lý campaigns, subscribers & analytics" />
      <EmailNav />

      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: s.color + "20" }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <TrendingUp size={14} className="text-[#D4A843]" />
              </div>
              <div className="text-2xl font-bold text-white mb-0.5">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-[11px] text-gray-400 mt-1">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Recent campaigns */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">Campaigns gần đây</h2>
              <div className="flex items-center gap-2">
                <Link
                  href="/email/campaigns"
                  className="text-xs text-[#9ca3af] hover:text-white transition-colors flex items-center gap-1"
                >
                  Xem tất cả <ArrowRight size={12} />
                </Link>
                <Link
                  href="/email/campaigns/new"
                  className="btn-green flex items-center gap-2 text-sm"
                >
                  <Plus size={15} /> Tạo campaign
                </Link>
              </div>
            </div>

            {recentCampaigns.length === 0 ? (
              <div className="card-dark p-10 text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(59,130,246,0.1)" }}>
                  <Inbox size={24} className="text-[#3b82f6]" />
                </div>
                <p className="text-white font-medium mb-1">Chưa có campaign nào</p>
                <p className="text-gray-500 text-sm">Tạo campaign đầu tiên để bắt đầu gửi email đến subscribers.</p>
              </div>
            ) : (
              <div className="card-dark overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2a2a2a" }}>
                      <th className="text-left text-xs text-gray-500 font-medium px-4 py-3">Tiêu đề</th>
                      <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Gửi</th>
                      <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Open %</th>
                      <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Click %</th>
                      <th className="text-right text-xs text-gray-500 font-medium px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCampaigns.map((c, i) => {
                      const denom = c.total_recipients ?? c.sent_count ?? 0;
                      const openRate = denom > 0 ? Math.round((c.open_count / denom) * 100) : 0;
                      const clickRate = denom > 0 ? Math.round((c.click_count / denom) * 100) : 0;
                      const st = statusConfig[c.status] ?? statusConfig.draft;
                      const dateLabel = c.sent_at
                        ? new Date(c.sent_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
                        : c.scheduled_at
                          ? `Lên lịch: ${new Date(c.scheduled_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
                          : "Bản nháp";
                      return (
                        <tr key={c.id}
                          style={{ borderBottom: i < recentCampaigns.length - 1 ? "1px solid #2a2a2a" : "none" }}
                          className="hover:bg-[#1f1f1f] transition-colors cursor-pointer">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Mail size={13} className="text-[#3b82f6] shrink-0" />
                              <div>
                                <div className="text-white text-sm font-medium leading-tight">{c.name || c.subject}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">{dateLabel}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300 text-sm">
                            {denom > 0 ? denom.toLocaleString("vi-VN") : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {denom > 0 ? (
                              <span className="text-[#D4A843] font-medium">{openRate}%</span>
                            ) : <span className="text-gray-600">{"—"}</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {denom > 0 ? (
                              <span className="text-[#3b82f6] font-medium">{clickRate}%</span>
                            ) : <span className="text-gray-600">{"—"}</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs font-medium px-2 py-1 rounded-full"
                              style={{ background: st.bg, color: st.color }}>
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">

            {/* Subscriber overview */}
            <div className="card-dark p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">Subscribers</h3>
                <Link
                  href="/email/subscribers"
                  className="text-[11px] text-[#D4A843] hover:underline"
                >
                  Quản lý
                </Link>
              </div>

              {total === 0 ? (
                <div className="text-center py-4">
                  <Users size={20} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs">Chưa có subscriber nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#222" }}>
                    <UserCheck size={14} className="text-[#D4A843]" />
                    <div className="flex-1">
                      <div className="text-white text-xs font-medium">Đang hoạt động</div>
                      <div className="text-[11px] text-gray-500">{active.toLocaleString("vi-VN")} subscribers</div>
                    </div>
                    <span className="text-xs font-medium text-[#D4A843]">
                      {total > 0 ? ((active / total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#222" }}>
                    <UserMinus size={14} className="text-[#f59e0b]" />
                    <div className="flex-1">
                      <div className="text-white text-xs font-medium">Huỷ đăng ký</div>
                      <div className="text-[11px] text-gray-500">{unsubscribed.toLocaleString("vi-VN")} subscribers</div>
                    </div>
                    <span className="text-xs font-medium text-[#f59e0b]">
                      {total > 0 ? ((unsubscribed / total) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#222" }}>
                    <AlertTriangle size={14} className="text-[#ef4444]" />
                    <div className="flex-1">
                      <div className="text-white text-xs font-medium">Bounce rate</div>
                      <div className="text-[11px] text-gray-500">{bounced.toLocaleString("vi-VN")} bounced</div>
                    </div>
                    <span className="text-xs font-medium text-[#ef4444]">{bounceRate}%</span>
                  </div>

                  {/* Visual bar breakdown */}
                  {total > 0 && (
                    <div className="mt-2">
                      <div className="h-2 rounded-full flex overflow-hidden" style={{ background: "#333" }}>
                        <div
                          className="h-full"
                          style={{
                            width: `${(active / total) * 100}%`,
                            background: "#D4A843",
                          }}
                        />
                        <div
                          className="h-full"
                          style={{
                            width: `${(unsubscribed / total) * 100}%`,
                            background: "#f59e0b",
                          }}
                        />
                        <div
                          className="h-full"
                          style={{
                            width: `${(bounced / total) * 100}%`,
                            background: "#ef4444",
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5 text-[10px] text-gray-500">
                        <span>{total} tổng</span>
                        <span>{active} active</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Compose */}
            <div className="card-dark p-4">
              <h3 className="font-semibold text-white text-sm mb-3">Gửi broadcast nhanh</h3>
              <div className="space-y-2.5">
                <input
                  type="text"
                  placeholder="Tiêu đề email..."
                  className="input-dark w-full text-sm"
                />
                <textarea
                  placeholder="Nội dung email..."
                  rows={4}
                  className="input-dark w-full text-sm resize-none"
                />
                <div className="flex items-center gap-2">
                  <select className="input-dark flex-1 text-sm">
                    <option>Tất cả subscribers ({active})</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 text-xs rounded-lg font-medium text-gray-400 transition-colors"
                    style={{ background: "#222", border: "1px solid #2a2a2a" }}>
                    <Clock size={12} className="inline mr-1" /> Lên lịch
                  </button>
                  <button className="btn-green flex-1 text-xs py-2 justify-center flex items-center gap-1">
                    <Send size={12} /> Gửi ngay
                  </button>
                </div>
              </div>
            </div>

            {/* Automations quick link */}
            <Link href="/email/automations" className="card-dark p-4 flex items-center gap-3 hover:bg-[#1f1f1f] transition-colors">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(20,184,166,0.1)" }}>
                <Workflow size={18} className="text-[#14b8a6]" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Automations</div>
                <div className="text-[11px] text-gray-500">{automations} workflow đang hoạt động</div>
              </div>
              <ArrowRight size={14} className="text-gray-500" />
            </Link>

            {/* Tips */}
            <div className="card-dark p-4" style={{ borderColor: "rgba(212,168,67,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-[#D4A843]" />
                <span className="text-xs font-semibold text-[#D4A843]">Best practices</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1.5">
                <li>- Gửi vào 7-9h sáng hoặc 7-9h tối</li>
                <li>- Subject line dưới 50 ký tự</li>
                <li>- CTA rõ ràng, 1 link chính mỗi email</li>
                <li>- Personalize với tên người nhận</li>
                <li>- A/B test subject line trước khi gửi hàng loạt</li>
                <li>- Dọn dẹp danh sách bounced email định kỳ</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
