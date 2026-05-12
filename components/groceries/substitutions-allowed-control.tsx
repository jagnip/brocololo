"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SubstitutionsAllowedControlProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  labelClassName?: string;
};

export function SubstitutionsAllowedControl({
  checked,
  onCheckedChange,
  className,
  labelClassName,
}: SubstitutionsAllowedControlProps) {
  const switchId = useId();

  return (
    <div
      className={cn(
        "inline-flex h-9 w-fit items-center gap-2 rounded-md border px-3",
        className,
      )}
    >
      {/* Link label to switch so clicking label toggles the switch. */}
      <Label htmlFor={switchId} className={labelClassName}>
        Allow subs
      </Label>
      {/* Shared substitutions toggle uses shadcn Switch across all forms. */}
      <Switch
        className="shrink-0"
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
