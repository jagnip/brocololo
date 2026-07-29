import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SegmentedControlOption<T extends string | boolean | number> = {
  value: T;
  label: ReactNode;
};

type SegmentedControlProps<T extends string | boolean | number> = Omit<
  ComponentProps<"div">,
  "children" | "onChange"
> & {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedControlOption<T>>;
  "aria-label": string;
};

/** Joined two-or-more-option toggle — one border, segments divided internally. */
export function SegmentedControl<T extends string | boolean | number>({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
  ...props
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex overflow-hidden rounded-md border border-border",
        className,
      )}
      {...props}
    >
      {options.map((option, index) => {
        const selected = value === option.value;

        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 min-w-[4.5rem] flex-1 px-3 text-sm font-medium transition-colors outline-none focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50",
              index > 0 && "border-l border-border",
              selected
                ? "bg-accent text-accent-foreground"
                : "bg-sidebar text-secondary-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
