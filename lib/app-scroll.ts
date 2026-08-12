/**
 * The authenticated app shell scrolls inside `[data-app-scroll]` (below the topbar),
 * not on `window`/`body`. Use these helpers anywhere that previously used window scroll.
 */
export function getAppScrollParent(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>("[data-app-scroll]");
}

/** Scroll offset of the app scrollport, with window fallback for non-shell pages. */
export function getAppScrollY(): number {
  const scroller = getAppScrollParent();
  if (scroller) return scroller.scrollTop;
  return window.scrollY;
}

export function appScrollTo(options: ScrollToOptions): void {
  const scroller = getAppScrollParent();
  if (scroller) {
    scroller.scrollTo(options);
    return;
  }
  window.scrollTo(options);
}

export function appScrollBy(options: ScrollToOptions): void {
  const scroller = getAppScrollParent();
  if (scroller) {
    scroller.scrollBy(options);
    return;
  }
  window.scrollBy(options);
}
