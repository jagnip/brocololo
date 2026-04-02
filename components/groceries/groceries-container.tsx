"use client";

import { useEffect, useMemo, useState } from "react";
import { GroceryPlan } from "@/types/groceries";
import { transformPlanToGroceryItems } from "@/lib/groceries/helpers";
import { GroceriesView } from "@/components/groceries/groceries-view";
import { getDaysInRange, formatDayLabel } from "@/lib/planner/helpers";
import { Button } from "@/components/ui/button";

/** UTC YYYY-MM-DD. PlanSlot.date is @db.Date (UTC midnight); plan bounds are full DateTime — full ISO strings must not be compared. */
function utcCalendarDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcCalendarDayKeyFromStored(iso: string): string {
  return iso.slice(0, 10);
}

export function GroceriesContainer({ plan }: { plan: GroceryPlan }) {
  const allDates = useMemo(
    () => getDaysInRange(new Date(plan.startDate), new Date(plan.endDate)),
    [plan.startDate, plan.endDate],
  );

  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(allDates.map(utcCalendarDayKey)),
  );

  // Re-init when navigating to another plan or when range changes (same component instance).
  useEffect(() => {
    setSelectedDates(new Set(allDates.map(utcCalendarDayKey)));
  }, [plan.startDate, plan.endDate, allDates]);

  const toggleDate = (dayKey: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) {
        next.delete(dayKey);
      } else {
        next.add(dayKey);
      }
      return next;
    });
  };

  const filteredSlots = useMemo(
    () =>
      plan.slots.filter((s) =>
        selectedDates.has(utcCalendarDayKeyFromStored(s.date)),
      ),
    [plan.slots, selectedDates],
  );

  const ingredients = useMemo(
    () => transformPlanToGroceryItems(filteredSlots),
    [filteredSlots],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Groceries</h1>
      <div className="flex flex-wrap gap-2">
        {allDates.map((date) => {
          const dayKey = utcCalendarDayKey(date);
          const isSelected = selectedDates.has(dayKey);
          return (
            <Button
              key={dayKey}
              variant={isSelected ? "default" : "outline"}
              size="default"
              onClick={() => toggleDate(dayKey)}
            >
              {formatDayLabel(date)}
            </Button>
          );
        })}
      </div>
      <GroceriesView ingredients={ingredients} />
    </div>
  );
}
