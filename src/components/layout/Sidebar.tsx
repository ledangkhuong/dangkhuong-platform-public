"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions/auth";
import { useMobileSidebar } from "@/components/layout/MobileSidebarContext";
import { siteConfig } from "@/lib/site-config";
import {
  LayoutDashboard, BookOpen, Users, MessageSquare,
  FileText, Mail, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Rocket, Trophy, Calendar,
  Star, ShieldCheck, Zap, X, UserPlus, Contact, GitBranch,
  FolderOpen, TrendingUp, Target, UserCheck, Tag, ClipboardCheck,
} from "lucide-react";

const mainNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tổng quan" },
  { href: "/courses", icon: BookOpen, label: "Khoá học" },
  { href: "/resources", icon: FolderOpen, label: "Tài nguyên" },
  { href: "/community", icon: Users, label: "Cộng đồng" },
  { href: "/blog", icon: FileText, label: "Blog" },
  { href: "/leaderboard", icon: Trophy, label: "Bảng xếp hạng" },
  { href: "/events", icon: Calendar, label: "Sự kiện" },
  { href: "/dashboard/affiliate", icon: Zap, label: "Affiliate" },
];

const adminNav = [
  { href: "/admin", icon: ShieldCheck, label: "Admin Panel", roles: ["admin"] },
  { href: "/admin/courses", icon: BookOpen, label: "Quản lý Khoá học", roles: ["admin", "manager"] },
  { href: "/admin/enrollments", icon: UserPlus, label: "Cấp khoá học", roles: ["admin", "manager"] },
  { href: "/admin/users", icon: Users, label: "Quản lý Users", roles: ["admin", "manager"] },
  { href: "/admin/orders", icon: Rocket, label: "Quản lý Đơn hàng", roles: ["admin", "manager", "sale"] },
  { href: "/admin/coupons", icon: Tag, label: "Mã giảm giá", roles: ["admin", "manager"] },
  { href: "/admin/quizzes", icon: ClipboardCheck, label: "Quản lý Quiz", roles: ["admin", "manager"] },
  { href: "/admin/blog", icon: FileText, label: "Quản lý Blog", roles: ["admin", "manager", "marketing"] },
  { href: "/admin/questions", icon: MessageSquare, label: "Câu hỏi học viên", roles: ["admin", "manager", "support"] },
  { href: "/email", icon: Mail, label: "Email Marketing", roles: ["admin", "manager", "marketing"] },
  { href: "/crm", icon: BarChart3, label: "CRM Doanh số", roles: ["admin", "manager", "sale"] },
  { href: "/crm/contacts", icon: Contact, label: "Khách hàng", roles: ["admin", "manager", "sale", "support"] },
  { href: "/crm/pipeline", icon: GitBranch, label: "Pipeline", roles: ["admin", "manager", "sale"] },
  { href: "/crm/performance", icon: TrendingUp, label: "Hiệu suất Sale", roles: ["admin", "manager"] },
  { href: "/crm/attribution", icon: Target, label: "Nguồn khách", roles: ["admin", "manager", "marketing"] },
  { href: "/crm/assignments", icon: UserCheck, label: "Phân công", roles: ["admin", "manager"] },
  { href: "/admin/affiliates", icon: Zap, label: "Quản lý Affiliate", roles: ["admin", "manager"] },
];

const settingsNav = [
  { href: "/settings", icon: Settings, label: "Cài đặt" },
];

interface Profile {
  full_name: string | null;
  role: string;
  tier: string;
  level: number;
  xp: number;
  avatar_url: string | null;
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>("");
  const { isOpen: mobileOpen, close: closeMobile } = useMobileSidebar();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      supabase
        .from("profiles")
        .select("full_name, role, tier, level, xp, avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as Profile);
        });
    });
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const displayName = profile?.full_name || email.split("@")[0] || "Tài khoản";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase() || "?";

  const userRole = profile?.role ?? "student";
  const isAdmin = userRole === "admin";
  const isStaff = ["admin", "manager", "marketing", "sale", "support"].includes(userRole);

  const roleLabels: Record<string, string> = {
    admin: "Admin", manager: "Quản lý", marketing: "Marketing",
    sale: "Sale", support: "CSKH",
  };
  const tierLabel = isStaff ? (roleLabels[userRole] ?? "Staff") : profile?.tier === "vip" ? "VIP" : profile?.tier === "member" ? "Member" : "Free";
  const tierColor = isAdmin ? "#ef4444" : isStaff ? "#3b82f6" : profile?.tier === "vip" ? "#f59e0b" : profile?.tier === "member" ? "#a855f7" : "#D4A843";

  // isCompact: on mobile drawer we always show expanded; on desktop respect collapsed
  const renderSidebar = (isCompact: boolean, isMobile: boolean) => (
    <aside
      className="flex flex-col h-screen transition-all duration-300"
      style={{
        width: isMobile ? 260 : isCompact ? 64 : 240,
        background: "#111111",
        borderRight: isMobile ? "none" : "1px solid #1f1f1f",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#1f1f1f]">
        {!isCompact && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image
              src={siteConfig.owner.avatar}
              alt={siteConfig.owner.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg object-cover"
            />
            <div>
              <div className="text-sm font-bold text-white leading-tight">{siteConfig.owner.name}</div>
              <div className="text-[10px] text-gray-500 leading-tight">Academy</div>
            </div>
          </Link>
        )}
        {isCompact && (
          <Link href="/dashboard">
            <Image
              src={siteConfig.owner.avatar}
              alt={siteConfig.owner.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg object-cover mx-auto"
            />
          </Link>
        )}
        {isMobile ? (
          <button
            onClick={closeMobile}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded ml-auto"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded ml-auto"
          >
            {isCompact ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {/* Main nav */}
        <div>
          {mainNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && item.href.length > 1 && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${isActive ? "active" : ""} ${isCompact ? "justify-center px-2" : ""}`}
                title={isCompact ? item.label : undefined}
              >
                <item.icon size={18} className="shrink-0" />
                {!isCompact && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Staff nav */}
        {isStaff && (
          <div className="mt-6">
            {!isCompact && (
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#f59e0b]">
                {isAdmin ? "Admin" : "Quản lý"}
              </div>
            )}
            {adminNav
              .filter((item) => item.roles.includes(userRole))
              .map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href.length > 1 && pathname.startsWith(item.href) && item.href !== "/admin");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-nav-item ${isActive ? "active" : ""} ${isCompact ? "justify-center px-2" : ""}`}
                    title={isCompact ? item.label : undefined}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {!isCompact && <span>{item.label}</span>}
                  </Link>
                );
              })}
          </div>
        )}

        {/* Settings */}
        <div className={isStaff ? "mt-2" : "mt-6"}>
          {!isStaff && !isCompact && (
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              Quản lý
            </div>
          )}
          {settingsNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${isActive ? "active" : ""} ${isCompact ? "justify-center px-2" : ""}`}
                title={isCompact ? item.label : undefined}
              >
                <item.icon size={18} className="shrink-0" />
                {!isCompact && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* CTA */}
      {!isCompact && !isStaff && (
        <a
          href="https://zalo.me/0782276727"
          target="_blank"
          rel="noopener noreferrer"
          className="block mx-3 mb-3 p-3 rounded-xl border border-[#D4A843]/20 hover:bg-[#1a1a1a] transition-colors"
          style={{ background: "rgba(212,168,67,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Star size={14} className="text-[#D4A843]" />
            <span className="text-xs font-semibold text-[#D4A843]">Cần tư vấn?</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-2">Tư vấn khoá học phù hợp nhu cầu của bạn</p>
          <span className="btn-green w-full text-xs py-1.5 justify-center inline-flex items-center">Liên hệ tư vấn</span>
        </a>
      )}

      {/* XP bar */}
      {!isCompact && profile && (
        <div className="mx-3 mb-2 px-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span className="flex items-center gap-1">
              <Zap size={10} className="text-[#f59e0b]" />
              Level {profile.level}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{ background: tierColor + "20", color: tierColor }}
            >
              {tierLabel}
            </span>
          </div>
          <div className="progress-bar" style={{ height: 3 }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, Math.round(((profile.xp - (profile.level - 1) * 200) / 200) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* User + Logout */}
      <div className="border-t border-[#1f1f1f] p-3">
        {!isCompact ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg, #D4A843, #059669)" }}
                >
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{displayName}</div>
                <div className="text-[11px] text-gray-500 truncate">{email || "Đang tải..."}</div>
              </div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1f1f1f" }}
              >
                <LogOut size={14} />
                Đăng xuất
              </button>
            </form>
          </div>
        ) : (
          <form action={signOut} className="w-full flex justify-center">
            <button
              type="submit"
              title="Đăng xuất"
              className="text-gray-500 hover:text-red-400 transition-colors p-1"
            >
              <LogOut size={16} />
            </button>
          </form>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        {renderSidebar(collapsed, false)}
      </div>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeMobile}
          />
          {/* Drawer */}
          <div className="relative h-full" style={{ width: 260 }}>
            {renderSidebar(false, true)}
          </div>
        </div>
      )}
    </>
  );
}
