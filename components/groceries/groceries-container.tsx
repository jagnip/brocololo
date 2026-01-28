"use client";

import { useMemo, useState } from "react";
import { GroceryPlan } from "@/types/groceries";
import { transformPlanToGroceryItems } from "@/lib/groceries/helpers";
import { GroceriesView } from "@/components/groceries/groceries-view";
import { getDaysInRange, formatDayLabel } from "@/lib/planner/helpers";
import { Button } from "@/components/ui/button";

export function GroceriesContainer({ plan }: { plan: GroceryPlan }) {
  const allDates = useMemo(
    () => getDaysInRange(new Date(plan.startDate), new Date(plan.endDate)),
    [plan.startDate, plan.endDate],
  );

  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    () => new Set(allDates.map((d) => d.toISOString())),
  );

  const toggleDate = (dateIso: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateIso)) {
        next.delete(dateIso);
      } else {
        next.add(dateIso);
      }
      return next;
    });
  };

  const filteredSlots = useMemo(
    () => plan.slots.filter((s) => selectedDates.has(s.date)),
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
          const iso = date.toISOString();
          const isSelected = selectedDates.has(iso);
          return (
            <Button
              key={iso}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDate(iso)}
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
