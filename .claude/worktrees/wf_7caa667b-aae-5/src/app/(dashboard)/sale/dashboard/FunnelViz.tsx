/**
 * FunnelViz — horizontal stage funnel for the Sale Dashboard.
 *
 * Pure-server, no client interaction needed. Takes the pre-aggregated
 * counts from getFunnel() and renders six color-coded horizontal bars,
 * sized proportional to the largest bucket so the visual "funnel" effect
 * is preserved even when intermediate stages have more contacts than the
 * top (which happens when leads convert quickly).
 */
import type { FunnelData } from "@/lib/sale-kpi";

type StageDef = {
  key: keyof FunnelData;
  label: string;
  color: string; // bg color (rgba)
  border: string; // border color
  textColor: string;
};

const STAGES: StageDef[] = [
  {
    key: "lead",
    label: "Khách lạ",
    color: "rgba(148,163,184,0.18)",
    border: "rgba(148,163,184,0.35)",
    textColor: "#cbd5e1",
  },
  {
    key: "contacted",
    label: "Đã liên hệ",
    color: "rgba(59,130,246,0.18)",
    border: "rgba(59,130,246,0.35)",
    textColor: "#93c5fd",
  },
  {
    key: "qualified",
    label: "Khách hàng",
    color: "rgba(168,85,247,0.18)",
    border: "rgba(168,85,247,0.35)",
    textColor: "#d8b4fe",
  },
  {
    key: "negotiation",
    label: "Thương lượng",
    color: "rgba(245,158,11,0.18)",
    border: "rgba(245,158,11,0.35)",
    textColor: "#fcd34d",
  },
  {
    key: "customer",
    label: "Hội viên",
    color: "rgba(212,168,67,0.22)",
    border: "rgba(212,168,67,0.45)",
    textColor: "#D4A843",
  },
  {
    key: "advocate",
    label: "Ủng hộ / Fan",
    color: "rgba(34,197,94,0.18)",
    border: "rgba(34,197,94,0.35)",
    textColor: "#86efac",
  },
];

export default function FunnelViz({ data }: { data: FunnelData }) {
  const total = STAGES.reduce((s, st) => s + (data[st.key] ?? 0), 0);
  const max = Math.max(1, ...STAGES.map((st) => data[st.key] ?? 0));

  return (
    <div className="card-dark p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">
          Phễu khách hàng
        </h3>
        <span className="text-xs text-gray-400">
          {total.toLocaleString("vi-VN")} tổng
        </span>
      </div>

      <div className="space-y-2">
        {STAGES.map((stage) => {
          const value = data[stage.key] ?? 0;
          const widthPct = Math.round((value / max) * 100);
          const sharePct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={stage.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{stage.label}</span>
                <span className="text-gray-400">
                  <span
                    className="font-semibold"
                    style={{ color: stage.textColor }}
                  >
                    {value}
                  </span>{" "}
                  <span className="text-gray-600">({sharePct}%)</span>
                </span>
              </div>
              <div
                className="h-3 w-full rounded-md"
                style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="h-full rounded-md transition-all"
                  style={{
                    width: `${Math.max(widthPct, value > 0 ? 6 : 0)}%`,
                    backgroundColor: stage.color,
                    border: `1px solid ${stage.border}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
