/** UTC day key YYYY-MM-DD — matches prior inline logic in plan/current. */
export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isWithinDateRange(date: Date, start: Date, end: Date) {
  const targetKey = toDateKey(date);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return targetKey >= startKey && targetKey <= endKey;
}

export type PlanDateRangeSlice = {
  id: string;
  startDate: Date;
  endDate: Date;
};

/**
 * Picks the “current” plan: today falls in [startDate, endDate] if any, else the first plan
 * in the list (callers should pass `getPlans()` order: newest `createdAt` first).
 */
export function resolveCurrentPlanFromList<T extends PlanDateRangeSlice>(
  plans: T[],
  today: Date = new Date(),
): T | null {
  if (plans.length === 0) return null;
  return (
    plans.find((plan) => isWithinDateRange(today, plan.startDate, plan.endDate)) ?? plans[0]
  );
}

/**
 * Day key for the Track tab: today when it falls in the plan, otherwise the nearest
 * plan boundary (start if today is before the plan, end if after).
 */
export function resolveTrackDayKey(
  plan: Pick<PlanDateRangeSlice, "startDate" | "endDate">,
  today: Date = new Date(),
): string {
  const todayKey = toDateKey(today);
  const startKey = toDateKey(plan.startDate);
  const endKey = toDateKey(plan.endDate);
  if (todayKey >= startKey && todayKey <= endKey) {
    return todayKey;
  }
  return todayKey < startKey ? startKey : endKey;
}
