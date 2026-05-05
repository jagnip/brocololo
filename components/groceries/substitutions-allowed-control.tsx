"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SubstitutionsAllowedControlProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function SubstitutionsAllowedControl({
  checked,
  onCheckedChange,
  className,
}: SubstitutionsAllowedControlProps) {
  return (
    <div className={cn("flex h-9 items-center justify-between rounded-md border px-3", className)}>
      <Label>Allow substitutions</Label>
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
      />
    </div>
  );
}
