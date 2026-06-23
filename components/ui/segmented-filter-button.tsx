import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Selected shell for segmented toggles; unselected uses Button `outline` unchanged. */
export const segmentedFilterSelectedClassName =
  "border-ring bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground";

/** Checkbox chips and segmented buttons share selected styling only. */
export function getSegmentedFilterSurfaceClassName(selected: boolean) {
  if (!selected) {
    return null;
  }
  return cn("transition-all", segmentedFilterSelectedClassName);
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
