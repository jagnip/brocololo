"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  /** Current value; `null` supports transient empty input (e.g. RHF clear-to-validate). */
  value: number | null;
  onValueChange: (next: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** When true, value is an editable number input; otherwise a read-only span. */
  editable?: boolean;
  ariaLabel?: string;
  decreaseLabel?: string;
  increaseLabel?: string;
  disabled?: boolean;
  className?: string;
  // Allow FormControl (Radix Slot) to wire a11y attributes onto the input.
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/**
 * Shared [−] value [+] quantity control used by recipe portions and cooking session UI.
 * Supports both editable (form) and read-only (display) modes.
 * Forwards ref to the editable input so FormControl can wire aria attributes.
 */
export const QuantityStepper = React.forwardRef<
  HTMLInputElement,
  QuantityStepperProps
>(function QuantityStepper(
  {
    value,
    onValueChange,
    min = 1,
    max,
    step = 1,
    editable = true,
    ariaLabel = "Quantity",
    decreaseLabel = "Decrease",
    increaseLabel = "Increase",
    disabled = false,
    className,
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  },
  ref,
) {
  const numericValue =
    typeof value === "number" && Number.isFinite(value) ? value : null;

  function clamp(next: number): number {
    let result = next;
    if (min != null) {
      result = Math.max(min, result);
    }
    if (max != null) {
      result = Math.min(max, result);
    }
    return result;
  }

  function stepBy(delta: number) {
    const current = numericValue ?? min;
    onValueChange(clamp(current + delta));
  }

  const atMin = numericValue != null && numericValue <= min;
  const atMax = max != null && numericValue != null && numericValue >= max;

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={decreaseLabel}
        disabled={disabled || atMin}
        onClick={() => stepBy(-step)}
      >
        <Minus className="h-4 w-4" />
      </Button>

      {editable ? (
        <Input
          ref={ref}
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          // Hide native spinners — the −/+ buttons replace them.
          className="h-8 w-14 text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={numericValue ?? ""}
          onChange={(event) => {
            const raw = event.target.value;
            // Empty → null so form validation can re-trigger on clear.
            if (raw === "") {
              onValueChange(null);
              return;
            }
            const parsed = Number(raw);
            if (!Number.isFinite(parsed)) {
              return;
            }
            onValueChange(clamp(parsed));
          }}
        />
      ) : (
        <span
          className="type-body min-w-6 text-center tabular-nums"
          aria-live="polite"
          aria-label={ariaLabel}
        >
          {numericValue ?? min}
        </span>
      )}

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={increaseLabel}
        disabled={disabled || atMax}
        onClick={() => stepBy(step)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
});
