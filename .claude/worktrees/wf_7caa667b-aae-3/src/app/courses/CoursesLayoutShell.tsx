"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import AIAssistant from "@/components/ai/AIAssistant";
import { MobileSidebarProvider } from "@/components/layout/MobileSidebarContext";

export default function CoursesLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <MobileSidebarProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ background: "#0a0a0a" }}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <AIAssistant />
      </div>
    </MobileSidebarProvider>
  );
}
