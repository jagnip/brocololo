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
  /** Dot badge when true and no count badge. */
  showDotBadge?: boolean;
  children: ReactNode;
};

/** Icon action for ingredient rows — optional count/dot badge and active ring. */
export function IngredientRowActionButton({
  active = false,
  badgeCount,
  showDotBadge = false,
  className,
  children,
  ...props
}: IngredientRowActionButtonProps) {
  const showCountBadge = badgeCount != null && badgeCount > 0;
  const showDot = showDotBadge && !showCountBadge;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
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
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-semibold leading-none text-destructive-foreground"
        >
          {badgeCount}
        </span>
      ) : null}
      {showDot ? (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-destructive"
        />
      ) : null}
    </Button>
  );
}
