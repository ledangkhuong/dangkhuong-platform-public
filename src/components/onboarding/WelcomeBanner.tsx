"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle,
  Circle,
  X,
  ChevronRight,
} from "lucide-react";

const DISMISS_KEY = "welcome_banner_dismissed";

interface ChecklistItem {
  label: string;
  completed: boolean;
  href?: string;
}

export default function WelcomeBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const wasDismissed = localStorage.getItem(DISMISS_KEY);
    if (wasDismissed) {
      setLoading(false);
      return;
    }

    setDismissed(false);
    fetchProgress();
  }, []);

  async function fetchProgress() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profile, enrollments, lesson_progress, posts in parallel
      const [profileRes, enrollRes, progressRes, postsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single(),
        supabase
          .from("enrollments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("lesson_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("completed", true),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const hasAvatar = !!profileRes.data?.avatar_url;
      const enrollCount = enrollRes.count ?? 0;
      const lessonCount = progressRes.count ?? 0;
      const postCount = postsRes.count ?? 0;

      const checklist: ChecklistItem[] = [
        {
          label: "Tạo tài khoản",
          completed: true,
        },
        {
          label: "Hoàn thiện hồ sơ",
          completed: hasAvatar,
          href: "/settings",
        },
        {
          label: "Đăng ký khoá học đầu tiên",
          completed: enrollCount > 0,
          href: "/courses",
        },
        {
          label: "Hoàn thành bài học đầu tiên",
          completed: lessonCount > 0,
          href: "/courses",
        },
        {
          label: "Tham gia cộng đồng",
          completed: postCount > 0,
          href: "/community",
        },
      ];

      setItems(checklist);

      // Auto-dismiss if all items are completed
      const allDone = checklist.every((item) => item.completed);
      if (allDone) {
        localStorage.setItem(DISMISS_KEY, "true");
        setDismissed(true);
      }
    } catch {
      // Silently fail — banner just won't show data
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "true");
  }

  if (dismissed || loading) return null;
  if (items.length === 0) return null;

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  return (
    <div className="card-dark p-5 relative">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-600 hover:text-gray-400 transition-colors"
        aria-label="Ẩn"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">
          Bắt đầu hành trình của bạn
        </h3>
        <p className="text-xs text-gray-500">
          Hoàn thành các bước dưới đây để trải nghiệm đầy đủ nền tảng.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400">Tiến độ</span>
          <span className="text-[#D4A843] font-medium">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: "linear-gradient(90deg, #D4A843, #e5bc5a)",
            }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {items.map((item) => {
          const content = (
            <div
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                item.completed
                  ? "opacity-60"
                  : item.href
                    ? "hover:bg-[#1f1f1f] cursor-pointer"
                    : ""
              }`}
            >
              {item.completed ? (
                <CheckCircle
                  size={18}
                  className="text-[#D4A843] shrink-0"
                />
              ) : (
                <Circle size={18} className="text-gray-600 shrink-0" />
              )}
              <span
                className={`text-sm flex-1 ${
                  item.completed
                    ? "text-gray-500 line-through"
                    : "text-gray-300"
                }`}
              >
                {item.label}
              </span>
              {!item.completed && item.href && (
                <ChevronRight size={14} className="text-gray-600" />
              )}
            </div>
          );

          if (!item.completed && item.href) {
            return (
              <Link key={item.label} href={item.href}>
                {content}
              </Link>
            );
          }

          return <div key={item.label}>{content}</div>;
        })}
      </div>
    </div>
  );
}
