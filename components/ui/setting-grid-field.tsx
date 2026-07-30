import * as React from "react";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Label } from "./label";
import { Switch } from "./switch";
import { cn } from "@/lib/utils";

type SettingGridFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  tooltip?: React.ReactNode;
  tooltipAriaLabel?: string;
};

/** Grid cell: uppercase label on top, control underneath. */
export function SettingGridField({
  label,
  children,
  className,
  tooltip,
  tooltipAriaLabel,
}: SettingGridFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label tooltip={tooltip} tooltipAriaLabel={tooltipAriaLabel}>
        {label}
      </Label>
      {children}
    </div>
  );
}

type SettingGridRowProps = {
  children: React.ReactNode;
  className?: string;
};

/** Inline row of compact setting fields — keeps controls adjacent instead of stretching across columns. */
export function SettingGridRow({ children, className }: SettingGridRowProps) {
  return (
    <div
      className={cn("flex flex-wrap items-start gap-x-10 gap-y-6", className)}
    >
      {children}
    </div>
  );
}

type SettingGridNumberProps = {
  value: number | undefined | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  suffix?: string;
  ariaLabel?: string;
  className?: string;
};

/** Compact numeric input with optional suffix (e.g. "meals"). */
export function SettingGridNumber({
  value,
  onChange,
  min = 1,
  suffix,
  ariaLabel,
  className,
}: SettingGridNumberProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Input
        type="number"
        min={min}
        className="h-9 w-14 shrink-0 px-2 text-center font-semibold tabular-nums"
        value={value ?? ""}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      {suffix ? (
        <span className="text-sm text-muted-foreground">{suffix}</span>
      ) : null}
    </div>
  );
}

type SettingGridCheckboxProps = Omit<
  React.ComponentProps<typeof Checkbox>,
  "onCheckedChange"
> & {
  label: string;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

/** Visible checkbox with clickable label text beside it. */
export function SettingGridCheckbox({
  label,
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: SettingGridCheckboxProps) {
  const isChecked = checked === true;

  return (
    // Whole row toggles the checkbox — label wraps control + text.
    <label
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-2 select-none",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        {...props}
      />
      <span
        className={cn(
          "text-sm",
          isChecked
            ? "font-semibold text-foreground"
            : "font-normal text-muted-foreground",
        )}
      >
        {label}
      </span>
    </label>
  );
}

type SettingGridSwitchProps = Omit<
  React.ComponentProps<typeof Switch>,
  "onCheckedChange"
> & {
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

/** Toggle switch aligned with other setting-grid controls. */
export function SettingGridSwitch({
  checked,
  onCheckedChange,
  className,
  disabled,
  size = "lg",
  ...props
}: SettingGridSwitchProps) {
  return (
    <div className={cn("flex h-9 items-center", className)}>
      <Switch
        size={size}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        {...props}
      />
    </div>
  );
}
