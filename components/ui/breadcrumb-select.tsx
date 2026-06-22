"use client";

import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlanNavigation } from "@/components/planner/use-plan-navigation";
import type { PlanNavigationKind } from "@/components/planner/use-plan-navigation";
import { cn } from "@/lib/utils";

export type BreadcrumbSelectOption = {
  id: string;
  label: string;
};

export type BreadcrumbSelectConfig = {
  kind: PlanNavigationKind;
  options: BreadcrumbSelectOption[];
  currentId: string;
};

type BreadcrumbSelectProps = {
  label: string;
  select: BreadcrumbSelectConfig;
};

/** Breadcrumb-styled plan switcher: crumb text + caret, opens a Select menu. */
export function BreadcrumbSelect({ label, select }: BreadcrumbSelectProps) {
  const { kind, options, currentId } = select;
  const { optimisticId, handleValueChange } = usePlanNavigation({
    currentPlanId: currentId,
    kind,
  });

  // Single plan: static crumb with no caret (nothing to switch to).
  if (options.length <= 1) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-current="page"
        className="block min-w-0 truncate text-foreground font-medium"
      >
        {label}
      </span>
    );
  }

  return (
    <Select
      value={optimisticId}
      onValueChange={handleValueChange}
      allowInlineClear={false}
    >
      <SelectTrigger
        aria-label="Switch meal plan"
        aria-current="page"
        className={cn(
          // Breadcrumb look: hug content width; truncate only when the header is tight.
          "h-auto w-fit max-w-full min-w-0 justify-start gap-0.5 border-0 bg-transparent p-0 shadow-none",
          "font-medium hover:bg-transparent dark:hover:bg-transparent",
          "focus-visible:ring-ring/50 data-[size=default]:h-auto data-[size=sm]:h-auto",
          // Hide the default ChevronsUpDown icon row from SelectTrigger.
          "[&>span:last-child]:hidden",
        )}
      >
        {/* Radix Select requires SelectValue inside the trigger to open reliably. */}
        <span className="inline-flex min-w-0 max-w-full items-center gap-0.5">
          <SelectValue className="min-w-0 truncate" placeholder={label} />
          <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
        </span>
      </SelectTrigger>
      <SelectContent
        align="start"
        position="popper"
        sideOffset={4}
        className={cn(
          // Hug longest option label; don't stretch to the breadcrumb flex slot width.
          "w-auto min-w-0",
          "[&_[data-radix-select-viewport]]:h-auto [&_[data-radix-select-viewport]]:w-auto [&_[data-radix-select-viewport]]:min-w-0",
        )}
      >
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
