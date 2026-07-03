import type { DayAudienceByMealType } from "@/lib/validations/planner";
import {
  getTimeLimitGroupForDate,
  type TimeLimitGroups,
} from "@/lib/planner/time-limit-mapping";

export type MealAudienceIds = {
  breakfastFamilyMemberIds: string[];
  lunchFamilyMemberIds: string[];
  dinnerFamilyMemberIds: string[];
};

export type AudienceGroups = {
  weekday: MealAudienceIds;
  weekend: MealAudienceIds;
};

export function createDefaultMealAudienceIds(
  familyMemberIds: string[],
): MealAudienceIds {
  return {
    breakfastFamilyMemberIds: [...familyMemberIds],
    lunchFamilyMemberIds: [...familyMemberIds],
    dinnerFamilyMemberIds: [...familyMemberIds],
  };
}

export function createDefaultAudienceGroups(
  familyMemberIds: string[],
): AudienceGroups {
  const defaults = createDefaultMealAudienceIds(familyMemberIds);
  return {
    weekday: { ...defaults },
    weekend: {
      breakfastFamilyMemberIds: [...defaults.breakfastFamilyMemberIds],
      lunchFamilyMemberIds: [...defaults.lunchFamilyMemberIds],
      dinnerFamilyMemberIds: [...defaults.dinnerFamilyMemberIds],
    },
  };
}

export function mapGroupAudienceToDaily(
  days: Date[],
  groups: AudienceGroups,
): DayAudienceByMealType[] {
  return days.map((date) => {
    const group = groups[getTimeLimitGroupForDate(date)];
    return {
      date: date.toISOString().slice(0, 10),
      breakfastFamilyMemberIds: [...group.breakfastFamilyMemberIds],
      lunchFamilyMemberIds: [...group.lunchFamilyMemberIds],
      dinnerFamilyMemberIds: [...group.dinnerFamilyMemberIds],
    };
  });
}

export function mergeDailyAudienceByDate(
  days: Date[],
  previousDailyAudience: DayAudienceByMealType[],
  fallbackGroups: AudienceGroups,
): DayAudienceByMealType[] {
  const previousByDate = new Map(
    previousDailyAudience.map((entry) => [entry.date, entry]),
  );

  return days.map((date) => {
    const dateKey = date.toISOString().slice(0, 10);
    const existing = previousByDate.get(dateKey);
    if (existing) return existing;

    const fallback = fallbackGroups[getTimeLimitGroupForDate(date)];
    return {
      date: dateKey,
      breakfastFamilyMemberIds: [...fallback.breakfastFamilyMemberIds],
      lunchFamilyMemberIds: [...fallback.lunchFamilyMemberIds],
      dinnerFamilyMemberIds: [...fallback.dinnerFamilyMemberIds],
    };
  });
}

export function getSlotAudienceIdsForMeal(
  dayAudience: DayAudienceByMealType | undefined,
  mealType: "BREAKFAST" | "LUNCH" | "DINNER",
): string[] {
  if (!dayAudience) {
    return [];
  }
  if (mealType === "BREAKFAST") {
    return dayAudience.breakfastFamilyMemberIds;
  }
  if (mealType === "LUNCH") {
    return dayAudience.lunchFamilyMemberIds;
  }
  return dayAudience.dinnerFamilyMemberIds;
}

// Re-export for callers that already import group availability from time limits.
export type { TimeLimitGroups };
