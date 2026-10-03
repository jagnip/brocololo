import type { LogDayData } from "@/lib/log/view-model";

export type LogMacroTotals = {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
};

export type LogDayStatistics = LogMacroTotals & {
  day: LogDayData;
  hasEntries: boolean;
};

export type LogPeriodStatistics = {
  days: LogDayStatistics[];
  totals: LogMacroTotals;
  dailyAverages: LogMacroTotals;
  loggedDayCount: number;
  planDayCount: number;
};

const EMPTY_MACROS: LogMacroTotals = {
  calories: 0,
  proteins: 0,
  fats: 0,
  carbs: 0,
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getLogDayStatistics(day: LogDayData): LogDayStatistics {
  const totals = day.slots.reduce<LogMacroTotals>(
    (result, slot) => {
      for (const recipe of slot.recipes) {
        result.calories += recipe.calories;
        result.proteins += recipe.proteins;
        result.fats += recipe.fats;
        result.carbs += recipe.carbs;
      }
      return result;
    },
    { ...EMPTY_MACROS },
  );

  return {
    day,
    hasEntries: day.slots.some((slot) => slot.recipes.length > 0),
    calories: round1(totals.calories),
    proteins: round1(totals.proteins),
    fats: round1(totals.fats),
    carbs: round1(totals.carbs),
  };
}

export function getLogPeriodStatistics(
  days: LogDayData[],
): LogPeriodStatistics {
  const dayStatistics = days.map(getLogDayStatistics);
  const totals = dayStatistics.reduce<LogMacroTotals>(
    (result, day) => {
      result.calories += day.calories;
      result.proteins += day.proteins;
      result.fats += day.fats;
      result.carbs += day.carbs;
      return result;
    },
    { ...EMPTY_MACROS },
  );
  const loggedDayCount = dayStatistics.filter((day) => day.hasEntries).length;
  const divisor = loggedDayCount || 1;

  return {
    days: dayStatistics,
    totals: {
      calories: round1(totals.calories),
      proteins: round1(totals.proteins),
      fats: round1(totals.fats),
      carbs: round1(totals.carbs),
    },
    dailyAverages: {
      calories: round1(totals.calories / divisor),
      proteins: round1(totals.proteins / divisor),
      fats: round1(totals.fats / divisor),
      carbs: round1(totals.carbs / divisor),
    },
    loggedDayCount,
    planDayCount: days.length,
  };
}
