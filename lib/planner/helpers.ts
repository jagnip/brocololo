import { DayMealsType, PlanInputType, SlotInputType } from "@/types/planner";
import { PlannerMealType } from "@/src/generated/enums";
import { DayTimeLimitsType } from "@/lib/validations/planner";
import { differenceInDays } from "date-fns";
import { RecipeType } from "@/types/recipe";
import { PROTEIN_GROUP_MAP } from "../constants";

export function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  // Important: plan/slot day keys are derived from `toISOString().slice(0, 10)` (UTC).
  // Using local midnight here causes off-by-one day shifts when local timezone != UTC.
  const current = new Date(start);
  current.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setUTCHours(0, 0, 0, 0);

  while (current.getTime() <= endDate.getTime()) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function groupSlotsByDate(plan: PlanInputType): Map<string, SlotInputType[]> {
  const slotsByDate = new Map<string, SlotInputType[]>();
  for (const slot of plan) {
    const date = slot.date.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const slots = slotsByDate.get(date) ?? [];
    slotsByDate.set(date, [...slots, slot]);
  }
  return slotsByDate;
}

export function getMealsForDate(
  slotsByDate: Map<string, SlotInputType[]>,
  dateKey: string
): DayMealsType {
  const slots = slotsByDate.get(dateKey)!;
  return {
    date: slots[0].date,
    breakfast: slots.find((s) => s.mealType === PlannerMealType.BREAKFAST)!,
    lunch: slots.find((s) => s.mealType === PlannerMealType.LUNCH)!,
    dinner: slots.find((s) => s.mealType === PlannerMealType.DINNER)!,
  };
}

export function getMealTimeLimit(
  dayLimits: DayTimeLimitsType | undefined,
  mealType: PlannerMealType,
  type: "handsOn" | "total",
): number | null {
  if (!dayLimits) return null;

  if (type === "handsOn") {
    if (mealType === PlannerMealType.BREAKFAST) return dayLimits.breakfastHandsOnMax;
    if (mealType === PlannerMealType.LUNCH) return dayLimits.lunchHandsOnMax;
    return dayLimits.dinnerHandsOnMax;
  }

  if (mealType === PlannerMealType.BREAKFAST) return dayLimits.breakfastTotalMax;
  if (mealType === PlannerMealType.LUNCH) return dayLimits.lunchTotalMax;
  return dayLimits.dinnerTotalMax;
}

export function getMaxDaysSinceLastUsedCandidate(candidates: RecipeType[], slotDate: Date): number {
  return candidates.reduce((max, r) => {
    if (!r.lastUsedInPlanner) return max;
    const days = differenceInDays(slotDate, r.lastUsedInPlanner);
    return Math.max(max, days);
  }, 0);
}

// Marks future slots as claimed by a batch recipe (servings > 2).
// Uses a Map so generatePlan knows which recipe was carried forward into each slot.
// Does NOT push to plan — generatePlan handles that so it can compute alternatives.
export function markBatchSlots(
  recipe: RecipeType,
  mealType: PlannerMealType,
  dayIndex: number,
  days: Date[],
  batchFilledSlots: Map<string, RecipeType>,
  overrideMeals?: number, // if provided, use this instead of recipe.servings
): void {
  const totalMeals = overrideMeals ?? Math.floor(recipe.servings / 2);
  const extraMeals = totalMeals - 1;
  if (extraMeals <= 0) return;

  let placed = 0;

  for (let i = 1; placed < extraMeals; i++) {
    const futureDay = days[dayIndex + i];
    if (!futureDay) break; // plan ends, waste remaining portions

    const futureSlotKey = `${futureDay.toISOString()}-${mealType}`;
    if (batchFilledSlots.has(futureSlotKey)) continue; // slot taken, skip to next day

    batchFilledSlots.set(futureSlotKey, recipe);
    placed++;
  }
}

// Resolves a recipe's protein category slug to its scoring group key
// e.g. "beef" → "red-meat", "chicken" → "chicken"
export function getProteinKey(recipe: RecipeType): string | null {
  const proteinCat = recipe.categories.find((c) => c.type === "PROTEIN");
  if (!proteinCat) return null;
  return PROTEIN_GROUP_MAP[proteinCat.slug] ?? proteinCat.slug;
}