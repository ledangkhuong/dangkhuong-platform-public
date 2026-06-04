"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions/auth";
import { useMobileSidebar } from "@/components/layout/MobileSidebarContext";
import { siteConfig } from "@/lib/site-config";
import UserAvatar from "@/components/admin/UserAvatar";
import {
  LayoutDashboard, BookOpen, Users, MessageSquare, MessageCircle,
  FileText, Mail, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, ChevronDown, Rocket, Trophy, Calendar,
  Star, ShieldCheck, Zap, X, UserPlus, Contact, GitBranch,
  FolderOpen, TrendingUp, Target, UserCheck, Tag, ClipboardCheck,
  CreditCard, GraduationCap, Megaphone, Eye, Shield,
  Video, Globe, Sparkles, Activity, Gauge, Filter, Layout, Link2,
  Package, FolderTree, PackageOpen, ShoppingBag,
  type LucideIcon,
} from "lucide-react";

const courseSubNav = [
  { href: "/courses?cat=video", icon: Video, label: "Làm video", color: "#3b82f6" },
  { href: "/courses?cat=branding", icon: Globe, label: "Xây kênh & thương hiệu", color: "#a855f7" },
  { href: "/courses?cat=business", icon: TrendingUp, label: "Kinh doanh & chuyển đổi", color: "#f59e0b" },
  { href: "/courses?cat=personal_development", icon: Sparkles, label: "Phát triển bản thân", color: "#22c55e" },
];

const shopSubNav = [
  { href: "/shop?type=book", icon: BookOpen, label: "Sách", color: "#D4A843" },
  { href: "/shop?type=merch", icon: Package, label: "Merch", color: "#ec4899" },
  { href: "/shop?type=digital", icon: Sparkles, label: "Sản phẩm số", color: "#3b82f6" },
];

const mainNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Tổng quan" },
  { href: "/courses", icon: BookOpen, label: "Khoá học", subNav: courseSubNav },
  { href: "/shop", icon: ShoppingBag, label: "Cửa hàng", subNav: shopSubNav },
  { href: "/resources", icon: FolderOpen, label: "Tài nguyên" },
  { href: "/community", icon: Users, label: "Cộng đồng" },
  { href: "/blog", icon: FileText, label: "Blog" },
  { href: "/leaderboard", icon: Trophy, label: "Bảng xếp hạng" },
  { href: "/events", icon: Calendar, label: "Sự kiện" },
  { href: "/subscriptions", icon: CreditCard, label: "Gói đăng ký" },
  { href: "/dashboard/affiliate", icon: Zap, label: "Affiliate" },
];

const instructorNav = [
  { href: "/instructor", icon: GraduationCap, label: "Giảng viên" },
  { href: "/instructor/courses", icon: BookOpen, label: "Khóa học của tôi" },
  { href: "/instructor/students", icon: Users, label: "Tiến trình học viên" },
  { href: "/instructor/questions", icon: MessageSquare, label: "Câu hỏi trong bài học" },
  { href: "/instructor/submissions", icon: ClipboardCheck, label: "Chấm bài" },
];

// Items in the instructor area that admin/manager can also access (review across all courses)
const STAFF_VIEWABLE_INSTRUCTOR_HREFS = [
  "/instructor/questions",
  "/instructor/submissions",
];

interface AdminNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  roles: string[];
  subNav?: { href: string; icon: LucideIcon; label: string; roles: string[] }[];
}

interface AdminNavGroup {
  key: string;
  label: string;
  color: string;
  items: AdminNavItem[];
}

const adminNavGroups: AdminNavGroup[] = [
  {
    key: "overview",
    label: "Tổng quan",
    color: "#f59e0b",
    items: [
      { href: "/admin", icon: ShieldCheck, label: "Admin Panel", roles: ["admin"] },
      { href: "/sale/dashboard", icon: Gauge, label: "Dashboard của tôi", roles: ["admin", "manager", "sale"] },
      { href: "/admin/sales-dashboard", icon: TrendingUp, label: "Tổng quan đội Sale", roles: ["admin", "manager"] },
    ],
  },
  {
    key: "content",
    label: "Nội dung",
    color: "#8b5cf6",
    items: [
      { href: "/admin/courses", icon: BookOpen, label: "Quản lý Khoá học", roles: ["admin", "manager", "editor", "instructor"] },
      { href: "/admin/enrollments", icon: UserPlus, label: "Cấp khoá học", roles: ["admin", "manager", "sale"] },
      { href: "/admin/quizzes", icon: ClipboardCheck, label: "Quản lý Quiz", roles: ["admin", "manager", "editor"] },
      { href: "/admin/blog", icon: FileText, label: "Quản lý Blog", roles: ["admin", "manager", "marketing"] },
      { href: "/admin/questions", icon: MessageSquare, label: "Câu hỏi học viên", roles: ["admin", "manager", "support", "editor"] },
    ],
  },
  {
    key: "sales",
    label: "Bán hàng",
    color: "#22c55e",
    items: [
      { href: "/admin/orders", icon: Rocket, label: "Quản lý Đơn hàng", roles: ["admin", "manager", "sale"] },
      { href: "/admin/orders/physical", icon: PackageOpen, label: "Đơn hàng vật lý", roles: ["admin", "manager", "sale", "support"] },
      { href: "/admin/products", icon: Package, label: "Sản phẩm", roles: ["admin", "manager", "sale"] },
      { href: "/admin/products/categories", icon: FolderTree, label: "Danh mục SP", roles: ["admin", "manager"] },
      { href: "/admin/users", icon: Users, label: "Quản lý Users", roles: ["admin", "manager", "sale"] },
      { href: "/admin/coupons", icon: Tag, label: "Mã giảm giá", roles: ["admin", "manager"] },
      { href: "/admin/subscriptions", icon: CreditCard, label: "Quản lý Gói", roles: ["admin", "manager"] },
      { href: "/admin/affiliates", icon: Zap, label: "Quản lý Affiliate", roles: ["admin", "manager"] },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    color: "#3b82f6",
    items: [
      { href: "/admin/promotions", icon: Star, label: "Quảng cáo đầu trang", roles: ["admin", "manager"] },
      { href: "/admin/featured-courses", icon: Sparkles, label: "Khoá học nổi bật", roles: ["admin", "manager"] },
      { href: "/admin/announcements", icon: Megaphone, label: "Thông báo", roles: ["admin", "manager"] },
      { href: "/email", icon: Mail, label: "Email Marketing", roles: ["admin", "manager", "marketing"] },
      { href: "/marketing/overview", icon: BarChart3, label: "Tổng quan", roles: ["admin", "manager", "marketing"] },
      { href: "/marketing/channels", icon: Globe, label: "Kênh marketing", roles: ["admin", "manager", "marketing"] },
      { href: "/marketing/campaigns", icon: Megaphone, label: "Chiến dịch", roles: ["admin", "manager", "marketing"] },
      { href: "/marketing/funnel", icon: Filter, label: "Phễu chuyển đổi", roles: ["admin", "manager", "marketing"] },
      { href: "/marketing/landing-pages", icon: Layout, label: "Landing pages", roles: ["admin", "manager", "marketing"] },
      { href: "/marketing/attribution", icon: Target, label: "Nguồn khách", roles: ["admin", "manager", "marketing"] },
      { href: "/marketing/utm-builder", icon: Link2, label: "Tạo link UTM", roles: ["admin", "manager", "marketing", "sale"] },
      {
        href: "/admin/pixel-settings", icon: Activity, label: "Pixel & CAPI", roles: ["admin", "manager", "marketing"],
        subNav: [
          { href: "/admin/pixel-settings/pages", icon: Globe, label: "Gắn Pixel vào landing", roles: ["admin", "manager", "marketing"] },
          { href: "/admin/pixel-settings/events", icon: Zap, label: "Mã sự kiện chuyển đổi", roles: ["admin", "manager", "marketing"] },
        ],
      },
    ],
  },
  {
    key: "crm",
    label: "CRM & Chăm sóc",
    color: "#ec4899",
    items: [
      { href: "/crm", icon: BarChart3, label: "CRM Doanh số", roles: ["admin", "manager", "sale"] },
      { href: "/crm/contacts", icon: Contact, label: "Khách hàng", roles: ["admin", "manager", "sale", "support"] },
      { href: "/crm/pipeline", icon: GitBranch, label: "Pipeline", roles: ["admin", "manager", "sale"] },
      { href: "/crm/performance", icon: TrendingUp, label: "Hiệu suất Sale", roles: ["admin", "manager"] },
      { href: "/crm/interests", icon: Eye, label: "Khách quan tâm", roles: ["admin", "manager", "sale", "support"] },
      { href: "/crm/moderation", icon: Shield, label: "Kiểm duyệt", roles: ["admin", "manager", "support"] },
      { href: "/crm/assignments", icon: UserCheck, label: "Phân công", roles: ["admin", "manager"] },
    ],
  },
  {
    key: "system",
    label: "Kết nối & Hệ thống",
    color: "#6b7280",
    items: [
      { href: "/admin/zalo", icon: MessageCircle, label: "Zalo OA", roles: ["admin"] },
    ],
  },
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
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const { isOpen: mobileOpen, close: closeMobile } = useMobileSidebar();

  // Auto-expand courses submenu when on courses page
  useEffect(() => {
    if (pathname.startsWith("/courses")) {
      setExpandedMenu("/courses");
    }
  }, [pathname]);

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
  const isInstructor = userRole === "instructor";
  // Admin/manager can also review submissions & lesson questions (across all courses)
  const isStaffViewer = userRole === "admin" || userRole === "manager";
  const isEditor = userRole === "editor";
  const isStaff = ["admin", "manager", "marketing", "sale", "support", "editor", "instructor"].includes(userRole);

  const roleLabels: Record<string, string> = {
    admin: "Admin", manager: "Quản lý", marketing: "Marketing",
    sale: "Sale", support: "CSKH", instructor: "Giảng viên",
    editor: "Biên tập viên",
  };
  const tierLabel = isStaff || isInstructor ? (roleLabels[userRole] ?? "Staff") : profile?.tier === "vip" ? "VIP" : profile?.tier === "member" ? "Member" : "Free";
  const tierColor = isAdmin ? "#ef4444" : isStaff ? "#3b82f6" : isInstructor ? "#8b5cf6" : profile?.tier === "vip" ? "#f59e0b" : profile?.tier === "member" ? "#a855f7" : "#D4A843";

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
              sizes="32px"
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
              sizes="32px"
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
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Menu chính">
        {/* Main nav */}
        <div>
          {mainNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && item.href.length > 1 && pathname.startsWith(item.href));
            const hasSubNav = item.subNav && item.subNav.length > 0;
            const isExpanded = expandedMenu === item.href;

            return (
              <div key={item.href}>
                {hasSubNav && !isCompact ? (
                  /* Parent item with submenu — click toggles submenu, link on icon/text */
                  <div>
                    <div
                      className={`sidebar-nav-item cursor-pointer ${isActive ? "active" : ""}`}
                      onClick={() => setExpandedMenu(isExpanded ? null : item.href)}
                    >
                      <Link href={item.href} className="flex items-center gap-2.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <item.icon size={18} className="shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                    {/* Submenu */}
                    <div
                      className="overflow-hidden transition-all duration-200"
                      style={{ maxHeight: isExpanded ? `${item.subNav!.length * 36 + 8}px` : "0px" }}
                    >
                      <div className="pl-4 py-1 space-y-0.5">
                        {item.subNav!.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors"
                          >
                            <sub.icon size={13} style={{ color: sub.color }} className="shrink-0" />
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`sidebar-nav-item ${isActive ? "active" : ""} ${isCompact ? "justify-center px-2" : ""}`}
                    title={isCompact ? item.label : undefined}
                  >
                    <item.icon size={18} className="shrink-0" />
                    {!isCompact && <span>{item.label}</span>}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Instructor nav — full for instructors, review-only subset for admin/manager */}
        {(isInstructor || isStaffViewer) && (
          <div className="mt-6">
            {!isCompact && (
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#8b5cf6]">
                {isInstructor ? "Giảng viên" : "Chấm bài & Hỏi đáp"}
              </div>
            )}
            {instructorNav
              .filter(
                (item) =>
                  isInstructor ||
                  STAFF_VIEWABLE_INSTRUCTOR_HREFS.includes(item.href)
              )
              .map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href.length > 1 && pathname.startsWith(item.href) && item.href !== "/instructor");
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

        {/* Staff nav — grouped */}
        {isStaff && adminNavGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;

          const isGroupCollapsed = collapsedGroups[group.key] ?? false;
          const toggleGroup = () => setCollapsedGroups((prev) => ({ ...prev, [group.key]: !prev[group.key] }));

          return (
            <div key={group.key} className="mt-4 first:mt-6">
              {!isCompact ? (
                <button
                  onClick={toggleGroup}
                  className="w-full flex items-center justify-between px-3 mb-1 group cursor-pointer"
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: group.color }}
                  >
                    {group.label}
                  </span>
                  <ChevronDown
                    size={12}
                    className="transition-transform duration-200 opacity-0 group-hover:opacity-100"
                    style={{ color: group.color, transform: isGroupCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                  />
                </button>
              ) : (
                <div className="mx-auto mb-1 w-5 border-t" style={{ borderColor: group.color + "40" }} />
              )}
              <div
                className="overflow-hidden transition-all duration-200"
                style={{ maxHeight: isGroupCollapsed && !isCompact ? 0 : 2000, opacity: isGroupCollapsed && !isCompact ? 0 : 1 }}
              >
                {visibleItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href.length > 1 && pathname.startsWith(item.href) && item.href !== "/admin");
                  const hasSubNav = item.subNav && item.subNav.length > 0;
                  const subVisible = hasSubNav ? item.subNav!.filter((s) => s.roles.includes(userRole)) : [];
                  const isSubExpanded = expandedMenu === item.href;

                  if (hasSubNav && subVisible.length > 0 && !isCompact) {
                    return (
                      <div key={item.href}>
                        <div
                          className={`sidebar-nav-item cursor-pointer ${isActive ? "active" : ""}`}
                          onClick={() => setExpandedMenu(isSubExpanded ? null : item.href)}
                        >
                          <Link href={item.href} className="flex items-center gap-2.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                            <item.icon size={18} className="shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                          <ChevronDown
                            size={14}
                            className={`shrink-0 text-gray-500 transition-transform duration-200 ${isSubExpanded ? "rotate-180" : ""}`}
                          />
                        </div>
                        <div
                          className="overflow-hidden transition-all duration-200"
                          style={{ maxHeight: isSubExpanded ? `${subVisible.length * 36 + 8}px` : "0px" }}
                        >
                          <div className="pl-4 py-1 space-y-0.5">
                            {subVisible.map((sub) => {
                              const isSubActive = pathname === sub.href || pathname.startsWith(sub.href);
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${isSubActive ? "text-white bg-[#1a1a1a]" : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"}`}
                                >
                                  <sub.icon size={13} className="shrink-0" />
                                  <span className="truncate">{sub.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

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
            </div>
          );
        })}

        {/* Settings */}
        <div className={isStaff ? "mt-2" : "mt-6"}>
          {!isStaff && !isCompact && (
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
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
          href={siteConfig.socials.zalo}
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

      {/* Legal links */}
      {!isCompact && (
        <div className="mx-3 mb-2 flex gap-2 text-[10px] text-gray-500">
          <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">Bảo mật</Link>
          <span>&middot;</span>
          <Link href="/terms-of-service" className="hover:text-gray-400 transition-colors">Điều khoản</Link>
        </div>
      )}

      {/* User + Logout */}
      <div className="border-t border-[#1f1f1f] p-3">
        {!isCompact ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={profile?.avatar_url}
                initials={initials}
                size={32}
                gradient="linear-gradient(135deg, #D4A843, #059669)"
              />
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
