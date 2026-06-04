interface LeadScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

function getScoreInfo(score: number): { label: string; color: string } {
  if (score <= 25) return { label: "Lạnh", color: "#6b7280" };
  if (score <= 50) return { label: "Ấm", color: "#3b82f6" };
  if (score <= 75) return { label: "Nóng", color: "#f59e0b" };
  return { label: "Rất nóng", color: "#ef4444" };
}

export default function LeadScoreBadge({
  score,
  size = "md",
}: LeadScoreBadgeProps) {
  const { label, color } = getScoreInfo(score);

  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: `${color}1a`,
        color: color,
      }}
    >
      <span className="font-semibold">{score}</span>
      <span>{label}</span>
    </span>
  );
}
