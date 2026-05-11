"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface MobileSidebarState {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarState>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <MobileSidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}
