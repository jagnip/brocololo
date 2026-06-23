"use client";

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
import type { FamilyMemberRow } from "@/lib/db/family-members";

type LogDayPersonToolbarControlsProps = {
  days: LogDayData[];
  selectedDayKey: string;
  onSelectDay: (dateKey: string) => void;
  familyMembers: FamilyMemberRow[];
};

/** Day + person selectors shared by log header and meal-plan Track toolbar row. */
export function LogDayPersonToolbarControls({
  days,
  selectedDayKey,
  onSelectDay,
  familyMembers,
}: LogDayPersonToolbarControlsProps) {
  return (
    <>
      <div className="min-w-0 w-40 sm:w-48">
        <Select
          value={selectedDayKey}
          onValueChange={onSelectDay}
          allowInlineClear={false}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue placeholder="Select a day" />
          </SelectTrigger>
          <SelectContent>
            {days.map((day) => (
              <SelectItem key={day.dateKey} value={day.dateKey}>
                {formatDayLabel(day.date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {familyMembers.length > 1 ? (
        <LogPersonSelectFromUrl familyMembers={familyMembers} />
      ) : null}
    </>
  );
}
