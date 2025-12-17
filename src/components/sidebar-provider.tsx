"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  setIsOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpenState] = useState(true);

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem("sidebar-open");
    if (saved !== null) {
      setIsOpenState(saved === "true");
    }
  }, []);

  const setIsOpen = (open: boolean) => {
    setIsOpenState(open);
    localStorage.setItem("sidebar-open", String(open));
  };

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};


