"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
}

interface ChannelSidebarProps {
  activeChannel: string;
  onChannelChange: (channel: string) => void;
}

export default function ChannelSidebar({
  activeChannel,
  onChannelChange,
}: ChannelSidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChannels() {
      try {
        const res = await fetch("/api/community/channels");
        const data = await res.json();
        if (data.channels) {
          setChannels(data.channels);
        }
      } catch {
        // Fallback defaults if API fails
        setChannels([
          { id: "general", name: "Chung", description: "Thảo luận chung về mọi chủ đề", icon: "💬", sort_order: 0 },
          { id: "questions", name: "Hỏi đáp", description: "Đặt câu hỏi và nhận câu trả lời", icon: "❓", sort_order: 1 },
          { id: "showcase", name: "Chia sẻ", description: "Chia sẻ thành quả và dự án", icon: "🏆", sort_order: 2 },
          { id: "resources", name: "Tài nguyên", description: "Chia sẻ tài liệu và công cụ hữu ích", icon: "📚", sort_order: 3 },
          { id: "introductions", name: "Giới thiệu", description: "Chào hỏi và giới thiệu bản thân", icon: "👋", sort_order: 4 },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchChannels();
  }, []);

  if (loading) {
    return (
      <>
        {/* Desktop skeleton */}
        <div className="hidden md:block w-56 shrink-0 border-r border-[#1f1f1f] p-3 space-y-1" style={{ background: "#0d0d0d" }}>
          <div className="px-3 py-2 mb-2">
            <div className="h-4 w-20 bg-[#2a2a2a] rounded animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg">
              <div className="w-5 h-5 bg-[#2a2a2a] rounded animate-pulse" />
              <div className="h-3.5 bg-[#2a2a2a] rounded animate-pulse" style={{ width: `${50 + i * 10}px` }} />
            </div>
          ))}
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-none border-b border-[#1f1f1f]" style={{ background: "#0d0d0d" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 bg-[#2a2a2a] rounded-full animate-pulse shrink-0" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav className="hidden md:block w-56 shrink-0 border-r border-[#1f1f1f] p-3 space-y-0.5" style={{ background: "#0d0d0d" }}>
        <div className="px-3 py-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Khu vực
          </span>
        </div>
        {channels.map((channel) => {
          const isActive = activeChannel === channel.id;
          return (
            <button
              key={channel.id}
              onClick={() => onChannelChange(channel.id)}
              title={channel.description || channel.name}
              className={`group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                isActive
                  ? "bg-[#D4A843]/15 text-[#D4A843]"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{channel.icon}</span>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium truncate block ${isActive ? "text-[#D4A843]" : ""}`}>
                  {channel.name}
                </span>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4A843] shrink-0" />
              )}
            </button>
          );
        })}

        {/* Tooltip-style description for active channel */}
        {channels.find((c) => c.id === activeChannel)?.description && (
          <div className="mt-3 mx-3 p-2.5 rounded-lg bg-[#111] border border-[#1f1f1f]">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {channels.find((c) => c.id === activeChannel)?.description}
            </p>
          </div>
        )}
      </nav>

      {/* Mobile: horizontal scroll */}
      <div
        className="md:hidden flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-none border-b border-[#1f1f1f]"
        style={{ background: "#0d0d0d" }}
      >
        {channels.map((channel) => {
          const isActive = activeChannel === channel.id;
          return (
            <button
              key={channel.id}
              onClick={() => onChannelChange(channel.id)}
              title={channel.description || channel.name}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0 transition-all duration-150 ${
                isActive
                  ? "bg-[#D4A843]/15 text-[#D4A843] border border-[#D4A843]/30"
                  : "bg-[#111] text-gray-400 border border-[#2a2a2a] hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-sm leading-none">{channel.icon}</span>
              <span className="font-medium">{channel.name}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
