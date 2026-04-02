"use client";

import { Button } from "@/components/ui/button";
import type { LogDayData } from "@/lib/log/view-model";
import { formatDayLabel } from "@/lib/planner/helpers";

/** Day pills + “Add day” for the log detail view; state and mutations stay in the parent. */
export type LogDayStripProps = {
  days: LogDayData[];
  selectedDayKey: string | null;
  onSelectDay: (dateKey: string) => void;
  logId?: string;
  isAddingDay: boolean;
  onAddDay: () => void;
};

export function LogDaySelector({
  days,
  selectedDayKey,
  onSelectDay,
  logId,
  isAddingDay,
  onAddDay,
}: LogDayStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {days.map((day) => {
        const isActive = day.dateKey === selectedDayKey;
        return (
          <button
            key={day.dateKey}
            type="button"
            className={
              isActive
                ? "h-8 rounded-md bg-foreground px-3 text-xs text-background"
                : "h-8 rounded-md border px-3 text-xs text-muted-foreground"
            }
            onClick={() => onSelectDay(day.dateKey)}
          >
            {formatDayLabel(day.date)}
          </button>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="default"
        disabled={isAddingDay || !logId}
        onClick={onAddDay}
      >
        {isAddingDay ? "Adding..." : "Add day"}
      </Button>
    </div>
  );
}
