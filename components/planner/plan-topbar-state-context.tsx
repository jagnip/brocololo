"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type PlanTopbarState = {
  onEditDates?: () => void;
  onGenerateGroceryList?: () => void;
  onGenerateLog?: () => void | Promise<void>;
  onDeletePlan?: () => void;
  isEditDatesDisabled?: boolean;
  isGenerateDisabled?: boolean;
  isGenerating?: boolean;
  isLoadingMeals?: boolean;
  isDeleteDisabled?: boolean;
  isDeleting?: boolean;
};

type PlanTopbarStateContextValue = {
  state: PlanTopbarState;
  setState: (state: PlanTopbarState) => void;
  resetState: () => void;
};

const DEFAULT_PLAN_TOPBAR_STATE: PlanTopbarState = {
  isEditDatesDisabled: true,
  isGenerateDisabled: true,
  isGenerating: false,
  isLoadingMeals: false,
  isDeleteDisabled: true,
  isDeleting: false,
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
