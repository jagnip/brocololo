"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type TopbarBadgeConfig = {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
};

export type TopbarActionConfig = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  ariaLabel?: string;
};

export type TopbarConfig = {
  actions: TopbarActionConfig[];
  badge?: TopbarBadgeConfig;
};

type TopbarContextValue = {
  config: TopbarConfig | null;
  setConfig: (config: TopbarConfig) => void;
  clearConfig: () => void;
};

const TopbarContext = createContext<TopbarContextValue | null>(null);

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TopbarConfig | null>(null);

  const setConfig = useCallback((next: TopbarConfig) => {
    setConfigState(next);
  }, []);

  const clearConfig = useCallback(() => {
    setConfigState(null);
  }, []);

  const value = useMemo(
    () => ({ config, setConfig, clearConfig }),
    [config, setConfig, clearConfig],
  );

  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}

export function useTopbar() {
  const context = useContext(TopbarContext);
  if (!context) {
    throw new Error("useTopbar must be used within TopbarProvider");
  }
  return context;
}
