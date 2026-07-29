import { useSyncExternalStore } from "react";

/** Prefer real hover (mouse/trackpad) over coarse touch pointers. */
const CAN_HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(CAN_HOVER_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(CAN_HOVER_QUERY).matches;
}

/** SSR/first paint: assume hover so desktop markup stays stable. */
function getServerSnapshot() {
  return true;
}

/** True when the device supports hover with a fine pointer (desktop). */
export function useCanHover() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
