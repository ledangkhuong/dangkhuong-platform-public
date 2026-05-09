"use client";

import { useState } from "react";
import { Search, Bell, Menu } from "lucide-react";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import SearchModal, { useSearchShortcut } from "@/components/layout/SearchModal";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  notification?: { label: string; text: string };
}

export default function TopBar({ title, subtitle, onMenuClick, notification }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  useSearchShortcut(() => setSearchOpen(true));

  return (
    <header className="sticky top-0 z-30" style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(8px)" }}>
      {/* Notification Bar */}
      {notification && (
        <div className="notification-bar flex items-center justify-center gap-3 py-2 px-4 text-sm">
          <Bell size={13} className="text-[#22c55e]" />
          <span className="text-gray-400 text-xs">
            Đăng Khương vừa cập nhật:
          </span>
          <span className="badge-green">{notification.label}</span>
          <span className="text-white text-xs font-medium">{notification.text}</span>
          <div className="flex gap-1 ml-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full"
                style={{ background: i === 1 ? "#22c55e" : "#333" }} />
            ))}
          </div>
        </div>
      )}

      {/* Main Top Bar */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick}
            className="text-gray-500 hover:text-white transition-colors md:hidden">
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
            style={{ background: "#151515", border: "1px solid #2a2a2a", minWidth: 180 }}
            onClick={() => setSearchOpen(true)}>
            <Search size={14} />
            <span>Tìm kiếm...</span>
            <kbd className="ml-auto text-[10px] text-gray-600 bg-[#2a2a2a] px-1.5 py-0.5 rounded">⌘K</kbd>
          </div>

          {/* Notification Bell */}
          <NotificationDropdown />

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white cursor-pointer"
            style={{ background: "linear-gradient(135deg, #22c55e, #059669)" }}>
            ĐK
          </div>
        </div>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
