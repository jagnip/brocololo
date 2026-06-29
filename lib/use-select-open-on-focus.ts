import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Controlled Select open state. Opens only when focus moves from the previous
 * field via Tab (not on click or after picking an option).
 */
export function useSelectOpenOnTabFromAdjacent(options: {
  disabled: boolean;
  /** When this changes, close the menu and clear pending tab intent. */
  resetKey?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const openOnNextFocusRef = useRef(false);
  const { disabled, resetKey } = options;

  useEffect(() => {
    setOpen(false);
    openOnNextFocusRef.current = false;
  }, [resetKey]);

  const markOpenOnTabFromAdjacent = useCallback(() => {
    openOnNextFocusRef.current = true;
  }, []);

  const handleTriggerFocus = useCallback(() => {
    if (!openOnNextFocusRef.current) return;
    openOnNextFocusRef.current = false;
    if (!disabled) {
      setOpen(true);
    }
  }, [disabled]);

  const clearTabOpenIntent = useCallback(() => {
    openOnNextFocusRef.current = false;
  }, []);

  return {
    open,
    onOpenChange: setOpen,
    markOpenOnTabFromAdjacent,
    handleTriggerFocus,
    clearTabOpenIntent,
  };
}

/** Call from the amount field: Tab (forward) should open the unit menu on focus. */
export function markUnitSelectOpenOnAmountTab(event: KeyboardEvent) {
  if (event.key === "Tab" && !event.shiftKey) {
    return true;
  }
  return false;
}

/** @deprecated Renamed to useSelectOpenOnTabFromAdjacent */
export const useSelectOpenOnFocus = useSelectOpenOnTabFromAdjacent;
