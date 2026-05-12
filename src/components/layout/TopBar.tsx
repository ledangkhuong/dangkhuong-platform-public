"use client";

import { useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import SearchModal, { useSearchShortcut } from "@/components/layout/SearchModal";
import { useMobileSidebar } from "@/components/layout/MobileSidebarContext";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  notification?: { label: string; text: string };
}

export default function TopBar({ title, subtitle, onMenuClick, notification }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  useSearchShortcut(() => setSearchOpen(true));
  const { toggle: toggleMobileSidebar } = useMobileSidebar();

  const handleMenuClick = onMenuClick || toggleMobileSidebar;

  return (
    <header className="sticky top-0 z-30" style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(8px)" }}>
      {/* Notification Bar — hide on small screens */}
      {notification && (
        <div className="notification-bar hidden sm:flex items-center justify-center gap-3 py-2 px-4 text-sm">
          <Bell size={13} className="text-[#D4A843]" />
          <span className="text-gray-400 text-xs">
            Đăng Khương vừa cập nhật:
          </span>
          <span className="badge-green">{notification.label}</span>
          <span className="text-white text-xs font-medium">{notification.text}</span>
          <div className="flex gap-1 ml-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full"
                style={{ background: i === 1 ? "#D4A843" : "#333" }} />
            ))}
          </div>
        </div>
      )}

      {/* Main Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <button onClick={handleMenuClick}
            className="text-gray-500 hover:text-white transition-colors lg:hidden">
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-white leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 leading-tight truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
            style={{ background: "#151515", border: "1px solid #2a2a2a", minWidth: 180 }}
            onClick={() => setSearchOpen(true)}>
            <Search size={14} />
            <span>Tìm kiếm...</span>
            <kbd className="ml-auto text-[10px] text-gray-600 bg-[#2a2a2a] px-1.5 py-0.5 rounded">⌘K</kbd>
          </div>

          {/* Mobile search button */}
          <button
            className="md:hidden text-gray-500 hover:text-white transition-colors p-1.5"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={18} />
          </button>

          {/* Notification Bell */}
          <NotificationDropdown />

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer shrink-0"
            style={{ background: "linear-gradient(135deg, #D4A843, #059669)" }}>
            ĐK
          </div>
        </div>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
