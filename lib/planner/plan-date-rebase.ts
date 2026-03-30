import { MEAL_TYPES } from "@/lib/constants";
import type { PlanInputType, SlotInputType } from "@/types/planner";
import { PlannerMealType } from "@/src/generated/enums";
import { getDaysInRange } from "@/lib/planner/helpers";

// UTC-safe day-key helpers to avoid timezone drift when shifting plan slots.
function toUtcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseUtcDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function shiftUtcDateKey(dateKey: string, deltaDays: number): string {
  const d = parseUtcDateKey(dateKey);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return toUtcDateKey(d);
}

// Rebase existing slots by a constant day delta:
// - shifted slots keep their mealType/recipe data
// - shifted slots that land outside the new range are dropped
// - every day in the new range gets all 3 meal slots (empty when missing)
export function rebasePlanSlotsByDateRangeDelta(params: {
  slots: PlanInputType;
  oldStartDateKey: string;
  newStartDateKey: string;
  newEndDateKey: string;
}): PlanInputType {
  const { slots, oldStartDateKey, newStartDateKey, newEndDateKey } = params;

  const oldStart = parseUtcDateKey(oldStartDateKey);
  const newStart = parseUtcDateKey(newStartDateKey);
  const newEnd = parseUtcDateKey(newEndDateKey);

  const dayDeltaMs = newStart.getTime() - oldStart.getTime();
  const deltaDays = Math.round(dayDeltaMs / (24 * 60 * 60 * 1000));

  const shiftedByKey = new Map<string, SlotInputType>();
  for (const slot of slots) {
    const oldKey = toUtcDateKey(slot.date);
    const shiftedKey = shiftUtcDateKey(oldKey, deltaDays);
    const mealKey = `${shiftedKey}-${slot.mealType}`;

    shiftedByKey.set(mealKey, {
      ...slot,
      date: parseUtcDateKey(shiftedKey),
    });
  }

  const result: PlanInputType = [];
  const days = getDaysInRange(newStart, newEnd);
  for (const day of days) {
    const dayKey = toUtcDateKey(day);

    for (const mealType of MEAL_TYPES as PlannerMealType[]) {
      const key = `${dayKey}-${mealType}`;
      const existing = shiftedByKey.get(key);

      if (existing) {
        result.push(existing);
        continue;
      }

      result.push({
        date: day,
        mealType,
        recipe: null,
        alternatives: [],
        used: false,
      });
    }
  }

  return result;
}

