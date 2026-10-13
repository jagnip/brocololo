"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

const SCROLLBAR_IDLE_MS = 900;

/**
 * Suggest-meals rail: hide scrollbar at rest without layout shift.
 * Keep the native gutter stable and hide only the thumb while idle.
 */
export function useScrollbarOnScroll(idleMs = SCROLLBAR_IDLE_MS) {
  const [isScrolling, setIsScrolling] = useState(false);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScroll = useCallback(() => {
    setIsScrolling(true);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      idleTimeoutRef.current = null;
    }, idleMs);
  }, [idleMs]);

  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, []);

  return {
    onScroll,
    className: isScrolling ? "" : "scrollbar-idle",
    style: {
      scrollbarGutter: "stable",
    } as CSSProperties,
  } as const;
}
