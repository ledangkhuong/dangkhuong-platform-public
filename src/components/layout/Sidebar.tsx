"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, Users, MessageSquare,
  FileText, Mail, BarChart3, Settings, LogOut,
  ChevronLeft, Rocket, Trophy, Calendar, Star, ShieldCheck
} from "lucide-react";

const navGroups = [
  {
    label: null,
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Tổng quan" },
      { href: "/courses", icon: BookOpen, label: "Khoá học" },
      { href: "/community", icon: Users, label: "Cộng đồng" },
      { href: "/blog", icon: FileText, label: "Blog" },
      { href: "/leaderboard", icon: Trophy, label: "Bảng xếp hạng" },
      { href: "/events", icon: Calendar, label: "Sự kiện" },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { href: "/email", icon: Mail, label: "Email Marketing" },
      { href: "/crm", icon: BarChart3, label: "CRM & Doanh số" },
      { href: "/admin", icon: ShieldCheck, label: "Admin Panel" },
      { href: "/settings", icon: Settings, label: "Cài đặt" },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300"
      style={{
        width: collapsed ? 64 : 240,
        background: "#111111",
        borderRight: "1px solid #1f1f1f",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-[#1f1f1f]">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
              ĐK
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-tight">Đăng Khương</div>
              <div className="text-[10px] text-gray-500 leading-tight">Academy</div>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white mx-auto"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}>
            ĐK
          </div>
        )}
        {!collapsed && (
          <button onClick={onToggle}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-6" : ""}>
            {group.label && !collapsed && (
              <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href.length > 1 && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}
                  className={`sidebar-nav-item ${isActive ? "active" : ""} ${collapsed ? "justify-center px-2" : ""}`}
                  title={collapsed ? item.label : undefined}>
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Premium CTA */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-xl border border-[#f59e0b]/20"
          style={{ background: "rgba(245,158,11,0.08)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Star size={14} className="text-[#f59e0b]" />
            <span className="text-xs font-semibold text-[#f59e0b]">Quyền Đồng Hành</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-2">Mở khoá toàn bộ khoá học & cộng đồng VIP</p>
          <button className="btn-gold w-full text-xs py-1.5 justify-center">
            Nâng cấp ngay
          </button>
        </div>
      )}

      {/* User + Logout */}
      <div className="border-t border-[#1f1f1f] p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #22c55e, #059669)" }}>
              ĐK
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">Đăng Khương</div>
              <div className="text-[11px] text-gray-500 truncate">Admin</div>
            </div>
            <button className="text-gray-500 hover:text-red-400 transition-colors p-1">
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button className="w-full flex justify-center text-gray-500 hover:text-red-400 transition-colors p-1">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
