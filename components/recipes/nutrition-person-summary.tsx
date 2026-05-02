"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

/** Macro badge cluster — left-aligned with name + calories (`gap-tight` matches recipe form preview). */
const MACRO_BADGE_ROW_CLASSNAME =
  "flex shrink-0 flex-nowrap items-center gap-tight";

/** Bordered card shell matching recipe page nutrition blocks (`border-border`, `bg-card`). */
export function NutritionPersonCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-item rounded-lg border border-border bg-card px-nest py-nest">
      {children}
    </div>
  );
}

type NutritionPersonSummaryRowProps = {
  personLabel: string;
  /** Custom calories chunk: Input + label on recipe view, Badge-only in form preview. */
  caloriesArea: ReactNode;
  protein: number;
  fat: number;
  carbs: number;
};

/**
 * Single-row layout for one diner’s macros; keeps responsive flex/grid behavior in one place.
 */
export function NutritionPersonSummaryRow({
  personLabel,
  caloriesArea,
  protein,
  fat,
  carbs,
}: NutritionPersonSummaryRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-item">
      <span className="w-[52px] shrink-0 type-body leading-4 text-muted-foreground">
        {personLabel}
      </span>
      {caloriesArea}
      <div className={MACRO_BADGE_ROW_CLASSNAME}>
        <Badge variant="secondary">{protein}g protein</Badge>
        <Badge variant="secondary">{fat}g fat</Badge>
        <Badge variant="secondary">{carbs}g carbs</Badge>
      </div>
    </div>
  );
}
