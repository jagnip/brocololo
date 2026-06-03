"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type EditableCaloriesBadgeProps = {
  /** Active calorie target for this person; empty input when null. */
  value: number | null;
  /** Shown when unfocused and no target (typically live calculated kcal). */
  placeholder: string;
  /** Accessible name — required when multiple badges exist on the page. */
  ariaLabel: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
};

/**
 * Recipe-page calorie target chip: outline badge with inline number and " kcal" suffix.
 */
export function EditableCaloriesBadge({
  value,
  placeholder,
  ariaLabel,
  onChange,
  onFocus,
  onBlur,
  className,
}: EditableCaloriesBadgeProps) {
  return (
    // Outline + hover/focus-within cue that this chip is editable.
    <Badge
      variant="outline"
      className={cn(
        // justify-start + tight gap so "300" and kcal sit close (badge default centers with gap-1).
        "cursor-text justify-start gap-1 hover:bg-accent/50 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
    >
      {/* 3ch default fits typical kcal; grows slightly for 4+ digits while typing. */}
      <input
        type="number"
        value={value?.toString() ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label={ariaLabel}
        className={cn(
          "h-auto w-[3ch] min-w-[3ch] max-w-[5ch] border-0 bg-transparent p-0 text-xs font-medium leading-none tabular-nums text-inherit outline-none",
          "[appearance:textfield] placeholder:text-foreground placeholder:opacity-100",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />
      <span aria-hidden="true">kcal</span>
    </Badge>
  );
}
