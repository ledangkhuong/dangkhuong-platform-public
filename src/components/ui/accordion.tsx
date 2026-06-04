"use client";

/**
 * Minimal accordion fallback using native <details>/<summary>.
 * No Radix dependency — keeps bundle small + works without JS.
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  type?: "single" | "multiple";
  collapsible?: boolean;
  defaultValue?: string | string[];
  className?: string;
  children?: React.ReactNode;
}

export function Accordion({ className, children }: AccordionProps) {
  return <div className={cn("divide-y divide-white/10", className)}>{children}</div>;
}

interface AccordionItemProps {
  value: string;
  className?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

const AccordionContext = React.createContext<{ value: string; defaultOpen: boolean }>({
  value: "",
  defaultOpen: true,
});

export function AccordionItem({ value, className, children, defaultOpen = true }: AccordionItemProps) {
  return (
    <AccordionContext.Provider value={{ value, defaultOpen }}>
      <details
        open={defaultOpen}
        className={cn("group py-2", className)}
        data-value={value}
      >
        {children}
      </details>
    </AccordionContext.Provider>
  );
}

interface AccordionTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

export function AccordionTrigger({ className, children }: AccordionTriggerProps) {
  return (
    <summary
      className={cn(
        "flex items-center justify-between gap-2 cursor-pointer py-3 px-1 text-sm font-medium text-white hover:text-[#D4A843] list-none [&::-webkit-details-marker]:hidden",
        className
      )}
    >
      <div className="flex-1">{children}</div>
      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-gray-400" />
    </summary>
  );
}

interface AccordionContentProps {
  className?: string;
  children?: React.ReactNode;
}

export function AccordionContent({ className, children }: AccordionContentProps) {
  return <div className={cn("pt-1 pb-4 px-1 text-sm", className)}>{children}</div>;
}
