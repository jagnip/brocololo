import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Selected/unselected shell classes shared by instruction person filters and planner toggles. */
export const segmentedFilterSelectedClassName =
  "border-ring bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground";
export const segmentedFilterUnselectedClassName =
  "border-border bg-card text-foreground shadow-xs hover:border-ring hover:bg-muted/40";

/** Shared muted toggle surface for segmented buttons and checkbox chips. */
export function getSegmentedFilterSurfaceClassName(selected: boolean) {
  return cn(
    "border transition-all",
    selected
      ? segmentedFilterSelectedClassName
      : segmentedFilterUnselectedClassName,
  );
}

type SegmentedFilterButtonProps = Omit<
  ComponentProps<typeof Button>,
  "variant"
> & {
  selected: boolean;
};

export function SegmentedFilterButton({
  selected,
  className,
  size = "default",
  ...props
}: SegmentedFilterButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      className={cn(
        getSegmentedFilterSurfaceClassName(selected),
        className,
      )}
      {...props}
    />
  );
}

type SegmentedFilterGroupProps = Omit<ComponentProps<"div">, "children"> & {
  "aria-label": string;
  children: ReactNode;
};

export function SegmentedFilterGroup({
  children,
  className,
  "aria-label": ariaLabel,
  ...props
}: SegmentedFilterGroupProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-start gap-item",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
