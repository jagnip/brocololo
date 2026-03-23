import { useEffect, useRef, useState } from "react";

export function useScrollDirection(threshold = 12) {
  const lastY = useRef(0);
  const [direction, setDirection] = useState<"up" | "down">("up");
  useEffect(() => {
    const onScroll = () => {
      // Clamp negative values that can appear during iOS/Safari "rubber band"
      // at the top edge; otherwise direction can get stuck and hide filters.
      const y = Math.max(0, window.scrollY);

      // When we're at the very top, always treat it as scrolling "up".
      // This prevents "-translate-y-full" from lingering when scroll bounces.
      if (y <= 0) {
        setDirection("up");
        lastY.current = 0;
        return;
      }

      const delta = y - lastY.current;

      // Keep baseline in sync even for small deltas to avoid stale direction.
      if (Math.abs(delta) < threshold) {
        lastY.current = y;
        return;
      }

      setDirection(delta > 0 ? "down" : "up");
      lastY.current = y;
    };

    // Initialize from the current scroll position so first scroll event
    // doesn't compute an exaggerated delta on mobile.
    lastY.current = Math.max(0, window.scrollY);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return direction;
}