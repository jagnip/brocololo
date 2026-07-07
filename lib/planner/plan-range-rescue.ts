import { MEAL_TYPES } from "@/lib/constants";
import { getDaysInRange } from "@/lib/planner/helpers";
import type { PlanInputType, SlotInputType } from "@/types/planner";
import { PlannerMealType } from "@/src/generated/enums";

const MEAL_TYPE_ORDER: Record<PlannerMealType, number> = {
  [PlannerMealType.BREAKFAST]: 0,
  [PlannerMealType.LUNCH]: 1,
  [PlannerMealType.DINNER]: 2,
};

export type UnallocatableMeal = {
  mealLabel: string;
  mealType: PlannerMealType;
  originalDateKey: string;
};

export type MealPositionMove = {
  mealLabel: string;
  fromDateKey: string;
  fromMealType: PlannerMealType;
  toDateKey: string;
  toMealType: PlannerMealType;
};

export type PlanRangeRescueResult = {
  plan: PlanInputType;
  relocatedCount: number;
  movedMeals: MealPositionMove[];
  unallocatableMeals: UnallocatableMeal[];
};

type OrphanCandidate = {
  slot: SlotInputType;
  originalDateKey: string;
};

type ShiftedSlot = {
  slot: SlotInputType;
  originalDateKey: string;
  targetDateKey: string;
};

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

function mealSlotKey(dateKey: string, mealType: PlannerMealType): string {
  return `${dateKey}-${mealType}`;
}

function hasPopulatedMeal(slot: SlotInputType): boolean {
  return Boolean(slot.recipe || slot.customMeal);
}

function getMealLabel(slot: SlotInputType): string {
  return slot.recipe?.name ?? slot.customMeal?.name ?? "Meal";
}

function daysBetweenDateKeys(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    Math.abs(parseUtcDateKey(a).getTime() - parseUtcDateKey(b).getTime()) / msPerDay,
  );
}

function createEmptySlot(day: Date, mealType: PlannerMealType): SlotInputType {
  return {
    date: day,
    mealType,
    recipe: null,
    customMeal: null,
    alternatives: [],
    used: false,
  };
}

function buildEmptyGrid(newStart: Date, newEnd: Date): Map<string, SlotInputType> {
  const grid = new Map<string, SlotInputType>();
  for (const day of getDaysInRange(newStart, newEnd)) {
    const dayKey = toUtcDateKey(day);
    for (const mealType of MEAL_TYPES as PlannerMealType[]) {
      grid.set(mealSlotKey(dayKey, mealType), createEmptySlot(day, mealType));
    }
  }
  return grid;
}

function sortOrphans(orphans: OrphanCandidate[]): OrphanCandidate[] {
  return [...orphans].sort((a, b) => {
    if (a.originalDateKey !== b.originalDateKey) {
      return a.originalDateKey.localeCompare(b.originalDateKey);
    }
    return (
      MEAL_TYPE_ORDER[a.slot.mealType] - MEAL_TYPE_ORDER[b.slot.mealType]
    );
  });
}

function findClosestEmptySlotKey(
  grid: Map<string, SlotInputType>,
  mealType: PlannerMealType,
  originalDateKey: string,
): string | null {
  const candidates: Array<{ key: string; dateKey: string; distance: number }> = [];

  for (const [key, slot] of grid) {
    if (slot.mealType !== mealType || hasPopulatedMeal(slot)) {
      continue;
    }
    const dateKey = toUtcDateKey(slot.date);
    candidates.push({
      key,
      dateKey,
      distance: daysBetweenDateKeys(originalDateKey, dateKey),
    });
  }

  candidates.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    return a.dateKey.localeCompare(b.dateKey);
  });

  return candidates[0]?.key ?? null;
}

function recordMoveIfChanged(
  moves: MealPositionMove[],
  slot: SlotInputType,
  fromDateKey: string,
  fromMealType: PlannerMealType,
  toDateKey: string,
  toMealType: PlannerMealType,
) {
  if (fromDateKey === toDateKey && fromMealType === toMealType) {
    return;
  }

  moves.push({
    mealLabel: getMealLabel(slot),
    fromDateKey,
    fromMealType,
    toDateKey,
    toMealType,
  });
}

/**
 * Rebases a plan to a new date range, rescuing orphaned meals into the nearest
 * empty slot of the same occasion before reporting unallocatable removals.
 */
export function rebasePlanWithMealRescue(params: {
  slots: PlanInputType;
  oldStartDateKey: string;
  newStartDateKey: string;
  newEndDateKey: string;
}): PlanRangeRescueResult {
  const { slots, oldStartDateKey, newStartDateKey, newEndDateKey } = params;

  const oldStart = parseUtcDateKey(oldStartDateKey);
  const newStart = parseUtcDateKey(newStartDateKey);
  const newEnd = parseUtcDateKey(newEndDateKey);

  const deltaDays = Math.round(
    (newStart.getTime() - oldStart.getTime()) / (24 * 60 * 60 * 1000),
  );

  const newRangeDateKeys = new Set(
    getDaysInRange(newStart, newEnd).map((day) => toUtcDateKey(day)),
  );

  const shiftedSlots: ShiftedSlot[] = slots.map((slot) => {
    const originalDateKey = toUtcDateKey(slot.date);
    const targetDateKey = shiftUtcDateKey(originalDateKey, deltaDays);
    return {
      slot,
      originalDateKey,
      targetDateKey,
    };
  });

  const grid = buildEmptyGrid(newStart, newEnd);
  const orphans: OrphanCandidate[] = [];
  const movedMeals: MealPositionMove[] = [];
  const placedOrigins = new Map<
    string,
    { dateKey: string; mealType: PlannerMealType }
  >();

  const inRangeShifted = shiftedSlots
    .filter(
      (entry) =>
        newRangeDateKeys.has(entry.targetDateKey) &&
        hasPopulatedMeal(entry.slot),
    )
    .sort((a, b) => {
      if (a.targetDateKey !== b.targetDateKey) {
        return a.targetDateKey.localeCompare(b.targetDateKey);
      }
      return (
        MEAL_TYPE_ORDER[a.slot.mealType] - MEAL_TYPE_ORDER[b.slot.mealType]
      );
    });

  // Place shifted in-range meals; incoming shifted meal keeps the slot on collision.
  for (const { slot, originalDateKey, targetDateKey } of inRangeShifted) {
    const key = mealSlotKey(targetDateKey, slot.mealType);
    const incoming: SlotInputType = {
      ...slot,
      date: parseUtcDateKey(targetDateKey),
    };
    const existing = grid.get(key)!;

    if (!hasPopulatedMeal(existing)) {
      grid.set(key, incoming);
      placedOrigins.set(key, {
        dateKey: originalDateKey,
        mealType: slot.mealType,
      });
      recordMoveIfChanged(
        movedMeals,
        slot,
        originalDateKey,
        slot.mealType,
        targetDateKey,
        slot.mealType,
      );
      continue;
    }

    const incumbentOrigin = placedOrigins.get(key)!;
    orphans.push({
      slot: existing,
      originalDateKey: incumbentOrigin.dateKey,
    });
    grid.set(key, incoming);
    placedOrigins.set(key, {
      dateKey: originalDateKey,
      mealType: slot.mealType,
    });
    recordMoveIfChanged(
      movedMeals,
      slot,
      originalDateKey,
      slot.mealType,
      targetDateKey,
      slot.mealType,
    );
  }

  // Out-of-range shifted populated meals become orphans for rescue.
  for (const { slot, originalDateKey, targetDateKey } of shiftedSlots) {
    if (newRangeDateKeys.has(targetDateKey) || !hasPopulatedMeal(slot)) {
      continue;
    }
    orphans.push({ slot, originalDateKey });
  }

  let relocatedCount = 0;
  const unallocatableMeals: UnallocatableMeal[] = [];

  for (const orphan of sortOrphans(orphans)) {
    const emptyKey = findClosestEmptySlotKey(
      grid,
      orphan.slot.mealType,
      orphan.originalDateKey,
    );

    if (!emptyKey) {
      unallocatableMeals.push({
        mealLabel: getMealLabel(orphan.slot),
        mealType: orphan.slot.mealType,
        originalDateKey: orphan.originalDateKey,
      });
      continue;
    }

    const targetSlot = grid.get(emptyKey)!;
    const targetDateKey = toUtcDateKey(targetSlot.date);
    grid.set(emptyKey, {
      ...orphan.slot,
      date: parseUtcDateKey(targetDateKey),
    });
    placedOrigins.set(emptyKey, {
      dateKey: orphan.originalDateKey,
      mealType: orphan.slot.mealType,
    });
    recordMoveIfChanged(
      movedMeals,
      orphan.slot,
      orphan.originalDateKey,
      orphan.slot.mealType,
      targetDateKey,
      orphan.slot.mealType,
    );
    relocatedCount += 1;
  }

  const plan = Array.from(grid.values()).sort((a, b) => {
    const dateA = toUtcDateKey(a.date);
    const dateB = toUtcDateKey(b.date);
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    return MEAL_TYPE_ORDER[a.mealType] - MEAL_TYPE_ORDER[b.mealType];
  });

  return {
    plan,
    relocatedCount,
    movedMeals,
    unallocatableMeals,
  };
}
