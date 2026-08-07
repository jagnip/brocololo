"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

const SCROLLBAR_IDLE_MS = 900;
/** Fallback until we measure a classic scrollbar (macOS/Win often ~11–15px). */
const SCROLLBAR_RESERVE_FALLBACK_PX = 15;

/**
 * Suggest-meals rail: hide scrollbar at rest without layout shift.
 * Idle → hide-scrollbar + end padding = measured scrollbar thickness.
 * Scrolling → drop that padding so the real scrollbar occupies the same space.
 */
export function useScrollbarOnScroll(idleMs = SCROLLBAR_IDLE_MS) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [reservePx, setReservePx] = useState(SCROLLBAR_RESERVE_FALLBACK_PX);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollElRef = useRef<HTMLDivElement | null>(null);

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

  // While the native scrollbar is visible (no pe reserve), learn its thickness.
  useEffect(() => {
    if (!isScrolling) return;
    const el = scrollElRef.current;
    if (!el) return;
    const thickness = el.offsetWidth - el.clientWidth;
    if (thickness > 0) {
      setReservePx((prev) => (prev === thickness ? prev : thickness));
    }
  }, [isScrolling]);

  return {
    ref: scrollElRef,
    onScroll,
    className: cn(!isScrolling && "hide-scrollbar"),
    style: {
      // Child content uses this for matching right inset (inherits).
      ["--suggest-scrollbar-reserve" as string]: `${reservePx}px`,
      // Only pad when hidden — while scrolling the native bar owns this space.
      ...(isScrolling ? {} : { paddingInlineEnd: reservePx }),
    } as CSSProperties,
  } as const;
}
