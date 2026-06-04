/**
 * Leaderboard — server-renderable HTML table ranking the sale team by MTD
 * revenue. Receives the pre-built rows from `getTeamLeaderboard()` so all
 * KPI/status computation lives in the helper.
 *
 * Each row links to the per-sale drill-down at /admin/sales-dashboard/[saleId].
 * Pure HTML / Tailwind, no client interaction.
 */
import Link from "next/link";
import UserAvatar from "@/components/admin/UserAvatar";
import type { SaleKPI } from "@/lib/sale-kpi";

type LeaderboardRow = SaleKPI & {
  rank: number;
  status: "on_track" | "needs_push" | "needs_coaching";
};

interface LeaderboardProps {
  rows: LeaderboardRow[];
  avatars?: Map<string, string | null>; // saleId → avatar_url
}

function formatVndCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusBadge({ status }: { status: LeaderboardRow["status"] }) {
  if (status === "on_track") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[11px] font-semibold text-green-300">
        <span aria-hidden>🟢</span> Đúng tiến độ
      </span>
    );
  }
  if (status === "needs_push") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-semibold text-yellow-300">
        <span aria-hidden>🟡</span> Cần đẩy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300">
      <span aria-hidden>🔴</span> Cần huấn luyện
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base" aria-label="rank 1">🥇</span>;
  if (rank === 2) return <span className="text-base" aria-label="rank 2">🥈</span>;
  if (rank === 3) return <span className="text-base" aria-label="rank 3">🥉</span>;
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1f1f1f] text-[11px] font-semibold text-gray-400">
      {rank}
    </span>
  );
}

export default function Leaderboard({ rows, avatars }: LeaderboardProps) {
  if (rows.length === 0) {
    return (
      <div className="card-dark p-6 text-center text-sm text-gray-500">
        Chưa có sale nào trong hệ thống. Thêm user với vai trò &quot;sale&quot; để bắt đầu.
      </div>
    );
  }

  return (
    <div className="card-dark overflow-hidden">
      <div className="border-b border-[#2a2a2a] px-5 py-4">
        <h3 className="text-base font-semibold text-white">Bảng xếp hạng đội sale</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Sắp xếp theo doanh số tháng này • Click để xem chi tiết từng sale
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-left text-[11px] uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Sale</th>
              <th className="px-4 py-2.5 text-right font-medium">DS tháng</th>
              <th className="px-4 py-2.5 text-right font-medium">% Target</th>
              <th className="px-4 py-2.5 text-right font-medium"># Đơn</th>
              <th className="px-4 py-2.5 text-right font-medium">Convert</th>
              <th className="px-4 py-2.5 text-right font-medium">AOV</th>
              <th className="px-4 py-2.5 text-right font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const href = r.sale_user_id
                ? `/admin/sales-dashboard/${r.sale_user_id}`
                : "#";
              const avatarUrl = r.sale_user_id ? avatars?.get(r.sale_user_id) ?? null : null;
              return (
                <tr
                  key={r.sale_user_id ?? r.rank}
                  className="border-b border-[#1a1a1a] transition-colors hover:bg-[#141414]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={href}
                      className="flex items-center"
                      aria-label={`Xem chi tiết ${r.full_name ?? "sale"}`}
                    >
                      <RankBadge rank={r.rank} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={href} className="flex items-center gap-2.5 hover:text-[#D4A843]">
                      <UserAvatar
                        src={avatarUrl}
                        initials={initials(r.full_name)}
                        role="sale"
                        size={28}
                      />
                      <span className="font-medium text-white">
                        {r.full_name || "(Chưa có tên)"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-[#D4A843]">
                      {formatVndCompact(r.revenue)}đ
                    </span>
                    {r.revenue_target ? (
                      <div className="text-[10px] text-gray-500">
                        / {formatVndCompact(r.revenue_target)}đ
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.revenue_pct !== null ? (
                      <span
                        className={
                          r.revenue_pct >= 80
                            ? "font-semibold text-green-400"
                            : r.revenue_pct >= 40
                              ? "font-semibold text-yellow-400"
                              : "font-semibold text-red-400"
                        }
                      >
                        {r.revenue_pct.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-200">{r.orders_paid}</td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {r.conversion_rate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {formatVndCompact(r.avg_order_value)}đ
                  </td>
                  <td className="px-4 py-3 text-right">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
