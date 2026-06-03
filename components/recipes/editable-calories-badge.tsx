"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EditableCaloriesBadgeProps = {
  /** Active calorie target; empty string in the input when null. */
  value: number | null;
  /** Shown when unfocused and no target (typically calculated kcal). */
  placeholder: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
};

/**
 * Self-row calorie target on the recipe page: one outline chip with an inline number
 * and a static " kcal" suffix, matching read-only secondary badges in the same row.
 */
export function EditableCaloriesBadge({
  value,
  placeholder,
  onChange,
  onFocus,
  onBlur,
  className,
}: EditableCaloriesBadgeProps) {
  return (
    // Outline + hover/focus-within cue that this chip is editable (read-only rows use secondary).
    <Badge
      variant="outline"
      className={cn(
        "cursor-text gap-0 hover:bg-accent/50 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
    >
      {/* Borderless number field: same text-xs / tabular-nums as sibling macro badges. */}
      <input
        type="number"
        value={value?.toString() ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label="Calories per portion"
        className={cn(
          "h-auto min-w-[3ch] max-w-[6ch] w-[4ch] border-0 bg-transparent p-0 text-xs font-medium leading-none tabular-nums text-inherit outline-none",
          "[appearance:textfield] placeholder:text-foreground placeholder:opacity-100",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      <span aria-hidden="true"> kcal</span>
    </Badge>
  );
}
