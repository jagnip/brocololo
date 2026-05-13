"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
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
  disabled?: boolean;
  ariaBusy?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  ariaLabel?: string;
  icon?: ReactNode;
};

export type TopbarConfig = {
  actions: TopbarActionConfig[];
  badge?: TopbarBadgeConfig;
  rightContent?: ReactNode;
};

type TopbarContextValue = {
  config: TopbarConfig | null;
  setConfig: (config: TopbarConfig) => void;
  clearConfig: () => void;
  isLogFilterPending: boolean;
  setLogFilterPending: (source: string, pending: boolean) => void;
};

const TopbarContext = createContext<TopbarContextValue | null>(null);

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TopbarConfig | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);
  const [logPendingSources, setLogPendingSources] = useState<
    Record<string, boolean>
  >({});

  const setConfig = useCallback((next: TopbarConfig) => {
    // If a clear was scheduled by an outgoing route, cancel it so topbar stays stable.
    if (clearTimeoutRef.current != null) {
      window.clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
    setConfigState(next);
  }, []);

  const clearConfig = useCallback(() => {
    // Hold previous config during route transitions so topbar doesn't flash skeletons.
    if (clearTimeoutRef.current != null) {
      window.clearTimeout(clearTimeoutRef.current);
    }
    clearTimeoutRef.current = window.setTimeout(() => {
      setConfigState(null);
      clearTimeoutRef.current = null;
    }, 2000);
  }, []);

  const setLogFilterPending = useCallback((source: string, pending: boolean) => {
    setLogPendingSources((prev) => {
      if (pending) {
        return { ...prev, [source]: true };
      }
      if (!(source in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[source];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      config,
      setConfig,
      clearConfig,
      isLogFilterPending: Object.keys(logPendingSources).length > 0,
      setLogFilterPending,
    }),
    [config, setConfig, clearConfig, logPendingSources, setLogFilterPending],
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
