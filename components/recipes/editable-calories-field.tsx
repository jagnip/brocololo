"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EditableCaloriesFieldProps = {
  /** Active calorie target for this person; empty input when null. */
  value: number | null;
  /** Shown when unfocused and no target (typically live calculated kcal). */
  placeholder: string;
  /** Accessible name — required when multiple fields exist on the page. */
  ariaLabel: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
};

/**
 * Recipe-page calorie target control: compact Input + "kcal" suffix.
 * Visually distinct from macro badges so it reads as a portion-scale input.
 */
export function EditableCaloriesField({
  value,
  placeholder,
  ariaLabel,
  onChange,
  onFocus,
  onBlur,
  className,
}: EditableCaloriesFieldProps) {
  const hasTarget = value != null;

  return (
    // Keep input + unit as one wrap unit in the nutrition flex row.
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-1",
        className,
      )}
    >
      <Input
        type="number"
        size="sm"
        // Narrow enough for typical kcal; grows slightly for 4+ digits.
        htmlSize={4}
        value={value?.toString() ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label={ariaLabel}
        className={cn(
          "h-8 w-[4.5ch] min-w-[4.5ch] max-w-[6ch] px-1.5 text-center tabular-nums",
          "[appearance:textfield] placeholder:text-foreground placeholder:opacity-100",
          "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          // Stronger border when a target is active (scaling mode).
          hasTarget && "border-ring",
        )}
      />
      <span className="type-body text-muted-foreground" aria-hidden="true">
        kcal
      </span>
    </div>
  );
}
