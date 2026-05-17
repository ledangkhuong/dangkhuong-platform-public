"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Bell, Menu, Settings, LogOut, User } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import NotificationDropdown from "@/components/layout/NotificationDropdown";
import SearchModal, { useSearchShortcut } from "@/components/layout/SearchModal";
import { useMobileSidebar } from "@/components/layout/MobileSidebarContext";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions/auth";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  notification?: { label: string; text: string };
}

interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export default function TopBar({ title, subtitle, onMenuClick, notification }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  useSearchShortcut(() => setSearchOpen(true));
  const { toggle: toggleMobileSidebar } = useMobileSidebar();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState<string>("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch user profile
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      supabase
        .from("profiles")
        .select("full_name, avatar_url, role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data as UserProfile);
        });
    });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [avatarMenuOpen]);

  const handleMenuClick = onMenuClick || toggleMobileSidebar;

  const displayName = profile?.full_name || email.split("@")[0] || "Tài khoản";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-30" style={{ background: "rgba(10,10,10,0.95)", backdropFilter: "blur(8px)" }}>
      {/* Notification Bar — visible on all screens, compact on mobile */}
      {notification && (
        <div className="notification-bar flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-1.5 sm:py-2 px-3 sm:px-4 text-sm">
          <Bell size={13} className="text-[#D4A843] shrink-0" />
          <span className="text-gray-400 text-xs">
            Lê Đăng Khương vừa cập nhật:
          </span>
          <span className="badge-green shrink-0">{notification.label}</span>
          <span className="text-white text-xs font-medium">{notification.text}</span>
          <div className="hidden sm:flex gap-1 ml-1">
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
            aria-label="Mở menu"
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

          {/* User Avatar + Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
              className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #D4A843, #059669)" }}
                >
                  {initials}
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {avatarMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                }}
              >
                {/* User Info */}
                <div className="px-4 py-3 border-b border-[#2a2a2a]">
                  <div className="flex items-center gap-3">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt=""
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: "linear-gradient(135deg, #D4A843, #059669)" }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {displayName}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {email || "Đang tải..."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    onClick={() => setAvatarMenuOpen(false)}
                  >
                    <Settings size={15} className="text-gray-500" />
                    Cài đặt tài khoản
                  </Link>

                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    onClick={() => setAvatarMenuOpen(false)}
                  >
                    <User size={15} className="text-gray-500" />
                    Tổng quan
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-[#2a2a2a] py-1">
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors w-full"
                    >
                      <LogOut size={15} />
                      Đăng xuất
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
