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

const MEAL_TYPE_ORDER: Record<PlannerMealType, number> = {
  [PlannerMealType.BREAKFAST]: 0,
  [PlannerMealType.LUNCH]: 1,
  [PlannerMealType.DINNER]: 2,
};

export function getPlanSlotKey(slot: SlotInputType): string {
  return `${slot.date.toISOString()}-${slot.mealType}`;
}

export function getOrderedPlanSlots(plan: PlanInputType): SlotInputType[] {
  // Stable ordering powers deterministic range selection behavior.
  return [...plan].sort((a, b) => {
    const dateA = a.date.toISOString().slice(0, 10);
    const dateB = b.date.toISOString().slice(0, 10);
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    return MEAL_TYPE_ORDER[a.mealType] - MEAL_TYPE_ORDER[b.mealType];
  });
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

export function getPlannerMealCount(
  recipe: Pick<RecipeType, "plannedMealCount">,
): number {
  // Explicit recipe default — no longer derived from servings / audience size.
  return Math.max(recipe.plannedMealCount, 1);
}

// Marks future slots as claimed by a multi-meal placement (batch leftovers or
// non-batch repeats). Carried slots inherit the source slot audience via
// batchSlotAudience and share batchGroupId for badge grouping.
export function markBatchSlots(
  recipe: RecipeType,
  mealType: PlannerMealType,
  dayIndex: number,
  days: Date[],
  batchFilledSlots: Map<string, RecipeType>,
  batchSlotAudience: Map<string, string[]>,
  batchSlotGroupIds: Map<string, string>,
  cookingFamilyMemberIds: string[],
  batchGroupId: string,
  options?: {
    overrideMeals?: number;
    enforceTimeLimit?: boolean;
    allDaysTimeLimits?: DayTimeLimitsType[];
  },
): void {
  const totalMeals =
    options?.overrideMeals ?? getPlannerMealCount(recipe);
  const extraMeals = totalMeals - 1;
  if (extraMeals <= 0) return;

  const enforceTimeLimit = options?.enforceTimeLimit ?? false;
  const allDaysTimeLimits = options?.allDaysTimeLimits ?? [];

  let placed = 0;

  for (let i = 1; placed < extraMeals; i++) {
    const futureDay = days[dayIndex + i];
    if (!futureDay) break; // plan ends, waste remaining meals

    const futureSlotKey = `${futureDay.toISOString()}-${mealType}`;
    if (batchFilledSlots.has(futureSlotKey)) continue; // slot taken, skip to next day

    // Non-batch repeats are a fresh cook each day — skip days that don't fit
    // hands-on/total time limits. Batch leftovers skip this check entirely.
    if (enforceTimeLimit) {
      const dateStr = futureDay.toISOString().slice(0, 10);
      const dayLimits = allDaysTimeLimits.find((d) => d.date === dateStr);
      const handsOnLimit = getMealTimeLimit(dayLimits, mealType, "handsOn");
      const totalLimit = getMealTimeLimit(dayLimits, mealType, "total");
      if (handsOnLimit !== null && recipe.handsOnTime > handsOnLimit) continue;
      if (totalLimit !== null && recipe.totalTime > totalLimit) continue;
    }

    batchFilledSlots.set(futureSlotKey, recipe);
    batchSlotAudience.set(futureSlotKey, [...cookingFamilyMemberIds]);
    batchSlotGroupIds.set(futureSlotKey, batchGroupId);
    placed++;
  }
}

/**
 * Derives live "N of M" labels for slots that share a batchGroupId.
 * Only groups with 2+ recipe-filled members are labeled.
 */
export function getBatchGroupLabels(
  plan: PlanInputType,
): Map<string, { index: number; total: number }> {
  const byGroup = new Map<string, SlotInputType[]>();

  for (const slot of plan) {
    if (!slot.batchGroupId || !slot.recipe) continue;
    const members = byGroup.get(slot.batchGroupId) ?? [];
    members.push(slot);
    byGroup.set(slot.batchGroupId, members);
  }

  const labels = new Map<string, { index: number; total: number }>();

  for (const members of byGroup.values()) {
    if (members.length < 2) continue;

    const sorted = [...members].sort((a, b) => {
      const dateA = a.date.toISOString().slice(0, 10);
      const dateB = b.date.toISOString().slice(0, 10);
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return MEAL_TYPE_ORDER[a.mealType] - MEAL_TYPE_ORDER[b.mealType];
    });

    sorted.forEach((slot, index) => {
      labels.set(getPlanSlotKey(slot), {
        index: index + 1,
        total: sorted.length,
      });
    });
  }

  return labels;
}

// Resolves a recipe's protein category slug to its scoring group key
// e.g. "beef" → "red-meat", "chicken" → "chicken"
export function getProteinKey(recipe: RecipeType): string | null {
  const proteinCat = recipe.categories.find((c) => c.type === "PROTEIN");
  if (!proteinCat) return null;
  return PROTEIN_GROUP_MAP[proteinCat.slug] ?? proteinCat.slug;
}