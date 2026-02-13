import { DayMealsType, PlanInputType, SlotInputType } from "@/types/planner";
import { MealType } from "@/src/generated/enums";
import { DayHandsOnType } from "@/lib/validations/planner";
import { differenceInDays } from "date-fns";
import { RecipeType } from "@/types/recipe";
import { PROTEIN_GROUP_MAP } from "../constants";

export function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
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
    breakfast: slots.find((s) => s.mealType === MealType.BREAKFAST)!,
    lunch: slots.find((s) => s.mealType === MealType.LUNCH)!,
    dinner: slots.find((s) => s.mealType === MealType.DINNER)!,
  };
}

export function getMealHandsOnLimit(dayLimits: DayHandsOnType | undefined, mealType: MealType): number | null {
  if (!dayLimits) return null;
  if (mealType === MealType.BREAKFAST) return dayLimits.breakfastMax;
  if (mealType === MealType.LUNCH) return dayLimits.lunchMax;
  return dayLimits.dinnerMax;
}

export function getMaxDaysSinceLastUsedCandidate(candidates: RecipeType[], slotDate: Date): number {
  return candidates.reduce((max, r) => {
    if (!r.lastUsedInPlanner) return max;
    const days = differenceInDays(slotDate, r.lastUsedInPlanner);
    return Math.max(max, days);
  }, 0);
}

// Carries forward extra portions from a batch recipe (servings > 2) to the same meal type
// on following days. Skips slots that are already filled, continues trying remaining days.
export function carryForwardBatchPortions(
  recipe: RecipeType,
  mealType: MealType,
  dayIndex: number,
  days: Date[],
  plan: PlanInputType,
  filledSlots: Set<string>,
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
    if (filledSlots.has(futureSlotKey)) continue; // slot taken, skip to next day

    plan.push({ date: new Date(futureDay), mealType, recipe });
    filledSlots.add(futureSlotKey);
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