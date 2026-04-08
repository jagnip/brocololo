"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type PlanTopbarState = {
  isGenerateDisabled: boolean;
  isGenerating: boolean;
  isDeleteDisabled: boolean;
  isDeleting: boolean;
  onGenerateLog?: () => void | Promise<void>;
  onDeletePlan?: () => void;
};

type PlanTopbarStateContextValue = {
  state: PlanTopbarState;
  setState: (state: PlanTopbarState) => void;
  resetState: () => void;
};

const DEFAULT_PLAN_TOPBAR_STATE: PlanTopbarState = {
  isGenerateDisabled: true,
  isGenerating: false,
  isDeleteDisabled: true,
  isDeleting: false,
  onGenerateLog: undefined,
  onDeletePlan: undefined,
};

const PlanTopbarStateContext = createContext<PlanTopbarStateContextValue | null>(null);

export function PlanTopbarStateProvider({ children }: { children: ReactNode }) {
  const [state, setStateValue] = useState<PlanTopbarState>(DEFAULT_PLAN_TOPBAR_STATE);

  const setState = useCallback((nextState: PlanTopbarState) => {
    setStateValue(nextState);
  }, []);

  const resetState = useCallback(() => {
    setStateValue(DEFAULT_PLAN_TOPBAR_STATE);
  }, []);

  const value = useMemo(
    () => ({
      state,
      setState,
      resetState,
    }),
    [state, setState, resetState],
  );

  return (
    <PlanTopbarStateContext.Provider value={value}>{children}</PlanTopbarStateContext.Provider>
  );
}

export function usePlanTopbarState() {
  const context = useContext(PlanTopbarStateContext);
  if (!context) {
    throw new Error("usePlanTopbarState must be used within PlanTopbarStateProvider");
  }
  return context;
}
