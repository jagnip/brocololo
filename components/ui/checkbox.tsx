"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { getSegmentedFilterSurfaceClassName } from "@/components/ui/segmented-filter-button"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // Muted shell aligned with SegmentedFilterButton instead of primary fill.
        "peer size-4 shrink-0 rounded-[4px] border border-border bg-card shadow-xs transition-shadow outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 data-[state=checked]:border-ring data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground data-[state=checked]:hover:bg-accent",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

type CheckboxWithLabelProps = React.ComponentProps<typeof Checkbox> & {
  label: React.ReactNode
  wrapperClassName?: string
  labelClassName?: string
}

function CheckboxWithLabel({
  id,
  label,
  wrapperClassName,
  labelClassName,
  checked,
  disabled,
  onCheckedChange,
  ...props
}: CheckboxWithLabelProps) {
  const generatedId = React.useId()
  const checkboxId = id ?? generatedId
  const isChecked = checked === true

  return (
    <div className={cn("inline-flex", wrapperClassName)}>
      <Label
        htmlFor={checkboxId}
        className={cn(
          // Chip-style toggle matches SegmentedFilterButton (e.g. Weekdays & weekends).
          "inline-flex h-9 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-medium normal-case tracking-normal text-foreground select-none focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          getSegmentedFilterSurfaceClassName(isChecked),
          disabled && "pointer-events-none opacity-50",
          labelClassName,
        )}
      >
        <Checkbox
          id={checkboxId}
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          {...props}
        />
        {label}
      </Label>
    </div>
  )
}

export { Checkbox, CheckboxWithLabel }
