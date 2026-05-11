"use client";

import { useState, type ReactNode } from "react";
import { List, X } from "lucide-react";

interface CourseMobileLayoutProps {
  mainContent: ReactNode;
  sidebarContent: ReactNode;
  lessonCount: number;
  chapterCount: number;
}

export default function CourseMobileLayout({
  mainContent,
  sidebarContent,
  lessonCount,
  chapterCount,
}: CourseMobileLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <>
      {/* Desktop: side-by-side layout */}
      <div className="hidden lg:flex h-[calc(100vh-64px)]">
        <div className="flex-1 overflow-y-auto p-6">{mainContent}</div>
        <aside
          className="w-80 overflow-y-auto border-l border-[#2a2a2a] shrink-0"
          style={{ background: "#111" }}
        >
          {sidebarContent}
        </aside>
      </div>

      {/* Mobile: stacked layout with floating toggle */}
      <div className="lg:hidden">
        <div className="p-4 overflow-y-auto">{mainContent}</div>

        {/* Floating button to toggle lesson list */}
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-sm font-medium text-white transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
          }}
        >
          <List size={18} />
          <span>{chapterCount} chương &middot; {lessonCount} bài</span>
        </button>

        {/* Mobile sidebar overlay */}
        {showSidebar && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowSidebar(false)}
            />
            {/* Slide-up panel */}
            <div
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden"
              style={{
                background: "#111",
                maxHeight: "85vh",
              }}
            >
              {/* Handle bar + close */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#2a2a2a]" style={{ background: "#111" }}>
                <div>
                  <div className="w-10 h-1 rounded-full bg-gray-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-white text-sm">Nội dung khoá học</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {chapterCount} chương &middot; {lessonCount} bài học
                  </p>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-500 hover:text-white transition-colors p-2"
                >
                  <X size={20} />
                </button>
              </div>
              {/* Scrollable lesson list */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 90px)" }}>
                {sidebarContent}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
