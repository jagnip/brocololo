"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

type PlannerBulkActionsFooterProps = {
  selectedCount: number;
  onReplaceMeals?: () => void;
  onRemoveMeals?: () => void;
  onDone: () => void;
};

/** Matches groceries Quick add spotlight buttons on a dark inset surface. */
const bulkBarActionClassName =
  "h-9 rounded-md border-white/15 bg-white/10 text-background shadow-none hover:border-white/25 hover:bg-white/15 hover:text-background disabled:pointer-events-none disabled:opacity-50";

const bulkBarDestructiveClassName =
  "h-9 rounded-md border-transparent bg-destructive text-primary-foreground shadow-none hover:bg-[color-mix(in_oklch,var(--destructive)_88%,white_12%)] hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50";

const bulkBarDoneClassName =
  "h-9 rounded-md border border-background/70 bg-transparent text-background shadow-none hover:bg-white/10 hover:text-background";

/** Reserve scroll space so the last meal row is not hidden under the fixed bar. */
const BULK_BAR_SCROLL_SPACER_CLASS = "h-14 shrink-0";

type InsetBounds = {
  left: number;
  width: number;
};

/** Tracks the main content column so a portaled fixed bar can span its full width. */
function useSidebarInsetBounds(): InsetBounds {
  const { state } = useSidebar();
  const [bounds, setBounds] = useState<InsetBounds>({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const inset = document.querySelector('[data-slot="sidebar-inset"]');
    if (!inset) {
      return;
    }

    const updateBounds = () => {
      const rect = inset.getBoundingClientRect();
      setBounds({ left: rect.left, width: rect.width });
    };

    updateBounds();

    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(inset);
    window.addEventListener("resize", updateBounds);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [state]);

  return bounds;
}

export function PlannerBulkActionsFooter({
  selectedCount,
  onReplaceMeals,
  onRemoveMeals,
  onDone,
}: PlannerBulkActionsFooterProps) {
  const [isMounted, setIsMounted] = useState(false);
  const insetBounds = useSidebarInsetBounds();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (selectedCount <= 0) {
    return null;
  }

  const slotLabel = selectedCount === 1 ? "slot" : "slots";
  const hasInsetBounds = insetBounds.width > 0;

  const bar = (
    <div
      className="fixed bottom-0 z-30 flex h-14 items-center border-t border-foreground/15 bg-foreground text-background shadow-lg"
      style={{
        left: insetBounds.left,
        width: insetBounds.width,
      }}
      role="toolbar"
      aria-label="Bulk slot actions"
    >
      {/* Count on the left; actions + Done grouped on the right. */}
      <div className="page-container flex w-full items-center justify-between gap-4 py-0!">
        <p className="shrink-0 text-sm font-medium tracking-tight">
          {selectedCount} {slotLabel} selected
        </p>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2">
            {onReplaceMeals ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReplaceMeals}
                className={bulkBarActionClassName}
              >
                Replace meals
              </Button>
            ) : null}
            {onRemoveMeals ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemoveMeals}
                className={bulkBarDestructiveClassName}
              >
                Remove meals
              </Button>
            ) : null}
          </div>

          {/* Explicit 1px line — Separator h-full collapses in this flex row. */}
          <div
            role="separator"
            aria-orientation="vertical"
            className="mx-1 h-6 w-px shrink-0 self-center bg-background/30"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDone}
            className={bulkBarDoneClassName}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={BULK_BAR_SCROLL_SPACER_CLASS} aria-hidden />
      {isMounted && hasInsetBounds ? createPortal(bar, document.body) : null}
    </>
  );
}
