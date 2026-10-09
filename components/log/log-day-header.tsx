"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogDayPersonToolbarControls } from "@/components/log/log-day-person-toolbar-controls";
import type { LogDayData } from "@/lib/log/view-model";
import { formatDayLabel } from "@/lib/planner/helpers";
import { PageHeader } from "../page-header";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getLogDayStatistics } from "@/lib/log/statistics";
import { LogNutritionSummary } from "./log-nutrition-summary";

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
  hideDayPersonInHeader?: boolean;
  showPageHeader?: boolean;
  familyMembers: FamilyMemberRow[];
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
  hideDayPersonInHeader = false,
  showPageHeader = true,
  familyMembers,
}: LogDayPanelHeaderProps) {
  const dayMacros = getLogDayStatistics(day);

  return (
    <div>
      {showPageHeader ? <PageHeader title="Log details" /> : null}

      <div className="flex flex-col gap-4">
        {showDayControls ? (
          <div className="flex flex-nowrap items-center gap-1.5 md:flex-wrap md:gap-2">
            {hideDayPersonInHeader ? null : (
              <LogDayPersonToolbarControls
                days={days}
                selectedDayKey={selectedDayKey}
                onSelectDay={onSelectDay}
                familyMembers={familyMembers}
              />
            )}

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

        <LogNutritionSummary
          label="Daily nutrition"
          metrics={[
            { label: "Calories", value: `${dayMacros.calories.toFixed(0)} kcal` },
            { label: "Protein", value: `${dayMacros.proteins.toFixed(1)} g` },
            { label: "Fat", value: `${dayMacros.fats.toFixed(1)} g` },
            { label: "Carbs", value: `${dayMacros.carbs.toFixed(1)} g` },
          ]}
        />
      </div>
    </div>
  );
}
