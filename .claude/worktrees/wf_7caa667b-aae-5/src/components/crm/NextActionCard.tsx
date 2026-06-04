import {
  Phone,
  Calendar,
  Mail,
  TrendingUp,
  RefreshCw,
  MessageCircle,
  ClipboardList,
} from "lucide-react";

interface NextAction {
  id: string;
  type: string;
  title: string;
  description?: string;
  priority: string;
  due_at?: string;
  status: string;
  assigned_to_name?: string;
}

interface NextActionCardProps {
  action: NextAction;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#6b7280",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  follow_up: Phone,
  demo_schedule: Calendar,
  send_info: Mail,
  upsell: TrendingUp,
  re_engage: RefreshCw,
  check_in: MessageCircle,
  custom: ClipboardList,
};

function formatVietnameseDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

export default function NextActionCard({ action }: NextActionCardProps) {
  const priorityColor = PRIORITY_COLORS[action.priority] || "#6b7280";
  const Icon = TYPE_ICONS[action.type] || ClipboardList;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
      {/* Priority dot */}
      <div className="flex-shrink-0 mt-1">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: priorityColor }}
        />
      </div>

      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon size={16} className="text-gray-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{action.title}</p>

        {action.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
            {action.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {action.due_at && (
            <span
              className="text-xs"
              style={{
                color: isOverdue(action.due_at) ? "#ef4444" : "#9ca3af",
              }}
            >
              {formatVietnameseDate(action.due_at)}
            </span>
          )}

          {action.assigned_to_name && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#2a2a2a] text-gray-300">
              {action.assigned_to_name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
