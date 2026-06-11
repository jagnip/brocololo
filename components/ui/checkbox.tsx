"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary",
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

  function handleLabelClick(event: React.MouseEvent<HTMLLabelElement>) {
    if (disabled || checked === undefined) {
      return
    }
    event.preventDefault()
    onCheckedChange?.(checked === true ? false : true)
  }

  return (
    <div className={cn("flex items-center gap-2", wrapperClassName)}>
      <Checkbox
        id={checkboxId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        {...props}
      />
      <Label
        htmlFor={checkboxId}
        className={cn("cursor-pointer normal-case tracking-normal", labelClassName)}
        onClick={handleLabelClick}
      >
        {label}
      </Label>
    </div>
  )
}

export { Checkbox, CheckboxWithLabel }
