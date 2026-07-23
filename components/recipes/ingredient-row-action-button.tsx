"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { getSegmentedFilterSurfaceClassName } from "@/components/ui/segmented-filter-button";
import { cn } from "@/lib/utils";

type IngredientRowActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size"
> & {
  /** Whether the related panel is expanded. */
  active?: boolean;
  /** Numeric badge (e.g. adjustment count). */
  badgeCount?: number;
  children: ReactNode;
};

/** Icon action for ingredient rows — optional count badge and active ring. */
export function IngredientRowActionButton({
  active = false,
  badgeCount,
  className,
  children,
  ...props
}: IngredientRowActionButtonProps) {
  const showCountBadge = badgeCount != null && badgeCount > 0;

  return (
    <Button
      type="button"
      variant="outline"
      // Match amount/unit control height (h-9), not icon-sm (h-8).
      size="icon"
      className={cn(
        "relative",
        getSegmentedFilterSurfaceClassName(active),
        className,
      )}
      aria-pressed={active}
      {...props}
    >
      {children}
      {showCountBadge ? (
        <span
          aria-hidden
          // Primary when adjustments exist — matches brand accent, not error/destructive.
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-semibold leading-none text-primary-foreground"
        >
          {badgeCount}
        </span>
      ) : null}
    </Button>
  );
}
