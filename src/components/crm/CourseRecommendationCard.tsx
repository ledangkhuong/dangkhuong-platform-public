interface CourseRecommendation {
  id: string;
  product_title: string;
  product_price: number;
  product_thumbnail?: string;
  reason?: string;
  score: number;
  status: string;
}

interface CourseRecommendationCardProps {
  recommendation: CourseRecommendation;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  suggested: { bg: "#3b82f61a", text: "#3b82f6", label: "Đề xuất" },
  sent: { bg: "#f59e0b1a", text: "#f59e0b", label: "Đã gửi" },
  accepted: { bg: "#22c55e1a", text: "#22c55e", label: "Chấp nhận" },
  declined: { bg: "#ef44441a", text: "#ef4444", label: "Từ chối" },
};

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CourseRecommendationCard({
  recommendation,
}: CourseRecommendationCardProps) {
  const statusStyle = STATUS_STYLES[recommendation.status] || STATUS_STYLES.suggested;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden bg-[#2a2a2a]">
        {recommendation.product_thumbnail ? (
          <img
            src={recommendation.product_thumbnail}
            alt={recommendation.product_title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
            📚
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-white truncate">
            {recommendation.product_title}
          </p>
          <span
            className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: statusStyle.bg,
              color: statusStyle.text,
            }}
          >
            {statusStyle.label}
          </span>
        </div>

        <p className="text-xs text-[#D4A843] font-medium mt-0.5">
          {formatVND(recommendation.product_price)}
        </p>

        {recommendation.reason && (
          <p className="text-xs text-gray-400 italic mt-1 line-clamp-2">
            {recommendation.reason}
          </p>
        )}

        {/* Score bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-500">Điểm phù hợp</span>
            <span className="text-[10px] text-gray-400">{recommendation.score}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#2a2a2a]">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(Math.max(recommendation.score, 0), 100)}%`,
                backgroundColor: "#D4A843",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
