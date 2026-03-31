"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LogDayData } from "@/lib/log/view-model";
import { formatDayLabel } from "@/lib/planner/helpers";

function toDayMacros(day: LogDayData) {
  return day.slots.reduce(
    (totals, slot) => {
      for (const recipe of slot.recipes) {
        totals.calories += recipe.calories;
        totals.proteins += recipe.proteins;
        totals.fats += recipe.fats;
        totals.carbs += recipe.carbs;
      }
      return totals;
    },
    { calories: 0, proteins: 0, fats: 0, carbs: 0 },
  );
}

/** Title row for the active log day: label, remove, daily macro totals. */
export type LogDayPanelHeaderProps = {
  day: LogDayData;
  logId?: string;
  isRemovingDay: boolean;
  onRemoveDay: () => void;
};

export function LogDayHeader({
  day,
  logId,
  isRemovingDay,
  onRemoveDay,
}: LogDayPanelHeaderProps) {
  const dayMacros = toDayMacros(day);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-base font-medium">{formatDayLabel(day.date)}</h2>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        disabled={isRemovingDay || !logId}
        aria-label={`Remove day ${formatDayLabel(day.date)}`}
        onClick={onRemoveDay}
      >
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
      <Badge variant="outline">{dayMacros.calories.toFixed(0)} kcal</Badge>
      <Badge variant="outline">{dayMacros.proteins.toFixed(1)}g protein</Badge>
      <Badge variant="outline">{dayMacros.fats.toFixed(1)}g fat</Badge>
      <Badge variant="outline">{dayMacros.carbs.toFixed(1)}g carbs</Badge>
    </div>
  );
}
