import type { MealTimeLimits } from "@/lib/constants";
import type { DayTimeLimitsType } from "@/lib/validations/planner";

export type TimeLimitGroups = {
  weekday: MealTimeLimits;
  weekend: MealTimeLimits;
};

export function getTimeLimitGroupForDate(date: Date): keyof TimeLimitGroups {
  const day = date.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function getRangeGroupAvailability(days: Date[]): {
  hasWeekdays: boolean;
  hasWeekend: boolean;
} {
  const initialAvailability: { hasWeekdays: boolean; hasWeekend: boolean } = {
    hasWeekdays: false,
    hasWeekend: false,
  };

  // Evaluate both groups from actual selected dates.
  return days.reduce(
    (acc, date) => {
      if (getTimeLimitGroupForDate(date) === "weekend") {
        acc.hasWeekend = true;
      } else {
        acc.hasWeekdays = true;
      }
      return acc;
    },
    initialAvailability,
  );
}

export function mapGroupLimitsToDailyLimits(
  days: Date[],
  groups: TimeLimitGroups,
): DayTimeLimitsType[] {
  return days.map((date) => {
    const group = groups[getTimeLimitGroupForDate(date)];
    return {
      date: date.toISOString().slice(0, 10),
      breakfastHandsOnMax: group.breakfastHandsOnMax,
      lunchHandsOnMax: group.lunchHandsOnMax,
      dinnerHandsOnMax: group.dinnerHandsOnMax,
      breakfastTotalMax: group.breakfastTotalMax,
      lunchTotalMax: group.lunchTotalMax,
      dinnerTotalMax: group.dinnerTotalMax,
    };
  });
}

export function mergeDailyLimitsByDate(
  days: Date[],
  previousDailyLimits: DayTimeLimitsType[],
  fallbackGroups: TimeLimitGroups,
): DayTimeLimitsType[] {
  const previousByDate = new Map(previousDailyLimits.map((limits) => [limits.date, limits]));

  // Keep existing day edits when a date is still in range; initialize new days from group defaults.
  return days.map((date) => {
    const dateKey = date.toISOString().slice(0, 10);
    const existing = previousByDate.get(dateKey);
    if (existing) return existing;

    const fallback = fallbackGroups[getTimeLimitGroupForDate(date)];
    return {
      date: dateKey,
      breakfastHandsOnMax: fallback.breakfastHandsOnMax,
      lunchHandsOnMax: fallback.lunchHandsOnMax,
      dinnerHandsOnMax: fallback.dinnerHandsOnMax,
      breakfastTotalMax: fallback.breakfastTotalMax,
      lunchTotalMax: fallback.lunchTotalMax,
      dinnerTotalMax: fallback.dinnerTotalMax,
    };
  });
}
