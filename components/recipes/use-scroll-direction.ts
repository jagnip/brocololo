import { useEffect, useRef, useState } from "react";

export function useScrollDirection(threshold = 12) {
  const lastY = useRef(0);
  const [direction, setDirection] = useState<"up" | "down">("up");
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) < threshold) return;
      setDirection(delta > 0 ? "down" : "up");
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return direction;
}