"use client";

import Link from "next/link";

interface PublicHeaderProps {
  user?: {
    email?: string;
    avatar_url?: string;
    full_name?: string;
  } | null;
}

export default function PublicHeader({ user }: PublicHeaderProps) {
  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((w) => w[0])
        .slice(-2)
        .join("")
        .toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : "?";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10,10,10,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid #1a1a1a",
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/images/about/portrait.jpg"
            alt="Lê Đăng Khương"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="text-sm font-bold text-white leading-tight hidden sm:block">
            Lê Đăng Khương
          </span>
        </Link>

        {/* Center Nav Links — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/courses"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Khoá học
          </Link>
          <Link
            href="/blog"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Blog
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Avatar */}
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #D4A843, #059669)",
                  }}
                >
                  {initials}
                </div>
              )}
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold py-1.5 px-4 rounded-lg transition-all"
                style={{
                  background: "linear-gradient(135deg, #FFD814, #FFA41C)",
                  color: "#131921",
                }}
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
