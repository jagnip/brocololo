"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogPersonSelectFromUrl } from "@/components/log/log-person-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LogDayData } from "@/lib/log/view-model";
import { formatDayLabel } from "@/lib/planner/helpers";
import { PageHeader } from "../page-header";

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
  days: LogDayData[];
  selectedDayKey: string;
  onSelectDay: (dateKey: string) => void;
  logId?: string;
  isAddingDay: boolean;
  onAddDay: () => void;
  isRemovingDay: boolean;
  onRemoveDay: () => void;
  showDayControls?: boolean;
  showDayManagementActions?: boolean;
  showPageHeader?: boolean;
};

export function LogDayHeader({
  day,
  days,
  selectedDayKey,
  onSelectDay,
  logId,
  isAddingDay,
  onAddDay,
  isRemovingDay,
  onRemoveDay,
  showDayControls = true,
  showDayManagementActions = true,
  showPageHeader = true,
}: LogDayPanelHeaderProps) {
  const dayMacros = toDayMacros(day);

  return (
    <div>
      {showPageHeader ? <PageHeader title="Log details" /> : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-2">
        {showDayControls ? (
          <div className="flex flex-nowrap items-center gap-1.5 md:flex-wrap md:gap-2">
            {/* Day selector; person lives in the app top bar next to the log switcher. */}
            <div className="min-w-0 flex-1 md:flex-none md:w-48">
              {/* Day is always required; disable shared Select inline clear (X). */}
              <Select
                value={selectedDayKey}
                onValueChange={onSelectDay}
                allowInlineClear={false}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d.dateKey} value={d.dateKey}>
                      {formatDayLabel(d.date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Person selector belongs under Log details in combined view. */}
            <LogPersonSelectFromUrl />

            {showDayManagementActions ? (
              <>
                {/* Actions order: add day → delete day */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={isAddingDay || !logId}
                  onClick={onAddDay}
                  aria-label="Add day"
                >
                  {isAddingDay ? <Loader2 className="animate-spin" /> : <Plus />}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={isRemovingDay || !logId}
                  aria-label={`Remove day ${formatDayLabel(day.date)}`}
                  onClick={onRemoveDay}
                >
                  {isRemovingDay ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {/* Macro badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{dayMacros.calories.toFixed(0)} kcal</Badge>
          <Badge variant="outline">
            {dayMacros.proteins.toFixed(1)}g protein
          </Badge>
          <Badge variant="outline">{dayMacros.fats.toFixed(1)}g fat</Badge>
          <Badge variant="outline">{dayMacros.carbs.toFixed(1)}g carbs</Badge>
        </div>

        {/* Actions */}
      </div>
    </div>
  );
}
