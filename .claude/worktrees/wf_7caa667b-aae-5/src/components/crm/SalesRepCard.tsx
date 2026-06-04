interface SalesRep {
  id: string;
  name: string;
  avatar?: string;
  total_contacts: number;
  converted_contacts: number;
  total_revenue: number;
  conversion_rate: number;
  pending_actions: number;
  active_deals: number;
}

interface SalesRepCardProps {
  rep: SalesRep;
}

function formatVND(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export default function SalesRepCard({ rep }: SalesRepCardProps) {
  const initials = rep.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(-2)
    .toUpperCase();

  return (
    <div className="p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {rep.avatar ? (
            <img
              src={rep.avatar}
              alt={rep.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#D4A843] flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          )}
          {rep.pending_actions > 0 && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-[#1a1a1a]" />
          )}
        </div>

        {/* Name and pending */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{rep.name}</p>
          {rep.pending_actions > 0 && (
            <p className="text-xs text-red-400">
              {rep.pending_actions} hành động đang chờ
            </p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* Contacts */}
        <div className="p-2 rounded bg-[#0f0f0f]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Liên hệ</p>
          <p className="text-sm font-semibold text-white">{rep.total_contacts}</p>
        </div>

        {/* Deals */}
        <div className="p-2 rounded bg-[#0f0f0f]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Deals</p>
          <p className="text-sm font-semibold text-white">
            {rep.converted_contacts}/{rep.active_deals}
          </p>
        </div>

        {/* Revenue */}
        <div className="p-2 rounded bg-[#0f0f0f]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Doanh thu</p>
          <p className="text-sm font-semibold text-[#D4A843]">
            {formatVND(rep.total_revenue)}
          </p>
        </div>

        {/* Conversion rate */}
        <div className="p-2 rounded bg-[#0f0f0f]">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Tỷ lệ</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex-1 h-1.5 rounded-full bg-[#2a2a2a]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(Math.max(rep.conversion_rate, 0), 100)}%`,
                  backgroundColor:
                    rep.conversion_rate >= 50
                      ? "#22c55e"
                      : rep.conversion_rate >= 25
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              />
            </div>
            <span className="text-xs text-gray-300 font-medium">
              {rep.conversion_rate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
