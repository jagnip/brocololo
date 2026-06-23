"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type GroceriesTopbarState = {
  onEditSupermarketLayout?: () => void;
  onCreateSupermarketLayout?: () => void;
  onDeleteGroceriesList?: () => void;
  isEditSupermarketLayoutDisabled?: boolean;
  isDeleteDisabled?: boolean;
  isDeleting?: boolean;
};

type GroceriesTopbarStateContextValue = {
  state: GroceriesTopbarState;
  setState: (state: GroceriesTopbarState) => void;
  resetState: () => void;
};

const DEFAULT_GROCERIES_TOPBAR_STATE: GroceriesTopbarState = {
  isEditSupermarketLayoutDisabled: true,
  isDeleteDisabled: true,
  isDeleting: false,
};

const GroceriesTopbarStateContext =
  createContext<GroceriesTopbarStateContextValue | null>(null);

export function GroceriesTopbarStateProvider({ children }: { children: ReactNode }) {
  const [state, setStateValue] = useState<GroceriesTopbarState>(
    DEFAULT_GROCERIES_TOPBAR_STATE,
  );

  const setState = useCallback((nextState: GroceriesTopbarState) => {
    setStateValue(nextState);
  }, []);

  const resetState = useCallback(() => {
    setStateValue(DEFAULT_GROCERIES_TOPBAR_STATE);
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
    <GroceriesTopbarStateContext.Provider value={value}>
      {children}
    </GroceriesTopbarStateContext.Provider>
  );
}

export function useGroceriesTopbarState() {
  const context = useContext(GroceriesTopbarStateContext);
  if (!context) {
    throw new Error(
      "useGroceriesTopbarState must be used within GroceriesTopbarStateProvider",
    );
  }
  return context;
}
