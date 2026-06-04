"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Users,
  List,
  FileText,
  Workflow,
  Tag,
  BarChart3,
} from "lucide-react";

const tabs = [
  { label: "Tổng quan", href: "/email", icon: LayoutDashboard },
  { label: "Campaigns", href: "/email/campaigns", icon: Send },
  { label: "Subscribers", href: "/email/subscribers", icon: Users },
  { label: "Lists", href: "/email/lists", icon: List },
  { label: "Templates", href: "/email/templates", icon: FileText },
  { label: "Automations", href: "/email/automations", icon: Workflow },
  { label: "Tags", href: "/email/tags", icon: Tag },
  { label: "Analytics", href: "/email/analytics", icon: BarChart3 },
];

export default function EmailNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/email") return pathname === "/email";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="sticky top-14 z-20 border-b"
      style={{
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(8px)",
        borderColor: "#2a2a2a",
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-[#D4A843] text-[#D4A843]"
                    : "border-transparent text-[#9ca3af] hover:text-white hover:border-[#2a2a2a]"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
