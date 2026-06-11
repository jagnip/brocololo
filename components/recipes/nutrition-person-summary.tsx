"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

type NutritionPersonCardProps = {
  children: ReactNode;
  /** Dark glass panel on recipe detail; light card in form preview. */
  variant?: "light" | "dark";
};

/** Bordered card shell matching recipe page nutrition blocks. */
export function NutritionPersonCard({
  children,
  variant = "light",
}: NutritionPersonCardProps) {
  return (
    <div
      className={
        variant === "dark"
          ? "flex flex-col gap-item rounded-lg border border-white/5 bg-white/10 px-nest py-nest backdrop-blur-md"
          : "flex flex-col gap-item rounded-lg border border-border bg-card px-nest py-nest"
      }
    >
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
  /** Light labels on dark nutrition panel (recipe detail). */
  tone?: "light" | "dark";
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
  tone = "light",
}: NutritionPersonSummaryRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-item">
      <span
        className={
          tone === "dark"
            ? "w-[52px] shrink-0 type-body leading-4 text-slate-400"
            : "w-[52px] shrink-0 type-body leading-4 text-muted-foreground"
        }
      >
        {personLabel}
      </span>
      {/* One flex-wrap lane: kcal (or input) and each macro badge wrap to the next row one chip at a time. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-tight">
        {caloriesArea}
        <Badge variant="secondary">{protein}g protein</Badge>
        <Badge variant="secondary">{fat}g fat</Badge>
        <Badge variant="secondary">{carbs}g carbs</Badge>
      </div>
    </div>
  );
}
