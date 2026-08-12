import type { CookingCombination } from "@/lib/recipes/cook-session-portions";
import { clampCombinationCount } from "@/lib/recipes/cook-session-portions";

/** Decoded planner → recipe hand-off payload. */
export type PlanCookSessionPayload = {
  combinations: CookingCombination[];
  /** Unique YYYY-MM-DD keys for the plan slots in this hand-off (chronological). */
  dateKeys: string[];
};

/**
 * Encode cooking combinations (+ optional slot dates) for a planner → recipe hand-off.
 * Format: `[YYYY-MM-DD,...|]id1,id2:count;id3:count`
 * (empty member list allowed → household default on decode).
 */
export function encodePlanCookParam(
  combinations: CookingCombination[],
  dateKeys: string[] = [],
): string {
  const body = combinations
    .map((combination) => {
      const members = combination.memberIds.join(",");
      const count = clampCombinationCount(combination.count);
      return `${members}:${count}`;
    })
    .join(";");

  const uniqueDates = [
    ...new Set(
      dateKeys.filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key)),
    ),
  ].sort((a, b) => a.localeCompare(b));

  if (uniqueDates.length === 0) {
    return body;
  }
  return `${uniqueDates.join(",")}|${body}`;
}

/**
 * Decode a `cook` query value into combinations + date keys.
 * Never throws — returns null on any malformed input so callers fall back to defaults.
 * Legacy values without a dates prefix still decode (dateKeys = []).
 */
export function decodePlanCookParam(
  value: string,
  currentHouseholdMemberIds: string[],
): PlanCookSessionPayload | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  // Next may pass a still-encoded value depending on navigation path.
  let raw = value.trim();
  try {
    if (raw.includes("%")) {
      raw = decodeURIComponent(raw);
    }
  } catch {
    return null;
  }

  let dateKeys: string[] = [];
  let combinationsRaw = raw;
  const pipeIndex = raw.indexOf("|");
  if (pipeIndex >= 0) {
    const datesPart = raw.slice(0, pipeIndex);
    combinationsRaw = raw.slice(pipeIndex + 1);
    dateKeys = datesPart
      .split(",")
      .map((key) => key.trim())
      .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));
    dateKeys = [...new Set(dateKeys)].sort((a, b) => a.localeCompare(b));
  }

  const householdSet = new Set(currentHouseholdMemberIds);
  const segments = combinationsRaw.split(";");
  const combinations: CookingCombination[] = [];

  for (const segment of segments) {
    const separatorIndex = segment.lastIndexOf(":");
    if (separatorIndex < 0) {
      return null;
    }

    const membersPart = segment.slice(0, separatorIndex);
    const countPart = segment.slice(separatorIndex + 1);
    if (!/^\d+$/.test(countPart)) {
      return null;
    }

    const parsedCount = Number.parseInt(countPart, 10);
    if (!Number.isFinite(parsedCount) || parsedCount < 1) {
      return null;
    }

    const rawIds =
      membersPart === ""
        ? []
        : membersPart.split(",").filter((id) => id.length > 0);

    // Drop unknown members; empty list falls back to current household.
    const knownIds = rawIds.filter((id) => householdSet.has(id));
    const memberIds =
      knownIds.length > 0 ? knownIds : [...currentHouseholdMemberIds];

    combinations.push({
      count: clampCombinationCount(parsedCount),
      memberIds,
    });
  }

  if (combinations.length === 0) {
    return null;
  }

  return { combinations, dateKeys };
}

/** English ordinal day: 1 → 1st, 2 → 2nd, 14 → 14th. */
function formatOrdinalDay(day: number): string {
  const remainder = day % 100;
  if (remainder >= 11 && remainder <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function parseDateKeyUtc(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  if (year == null || month == null || day == null) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Human date list for the plan hand-off banner.
 * - 1 day: "14th Jun"
 * - Same month: "14th, 15th, 16th of June"
 * - Mixed months: "14th Jun, 2nd Jul"
 */
export function formatPlanCookSessionDates(dateKeys: string[]): string {
  const unique = [...new Set(dateKeys)]
    .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .sort((a, b) => a.localeCompare(b));
  const dates = unique
    .map(parseDateKeyUtc)
    .filter((date): date is Date => date != null);

  if (dates.length === 0) {
    return "";
  }

  if (dates.length === 1) {
    const date = dates[0]!;
    const day = formatOrdinalDay(date.getUTCDate());
    const month = date.toLocaleDateString("en-GB", {
      month: "short",
      timeZone: "UTC",
    });
    return `${day} ${month}`;
  }

  const sameMonth = dates.every(
    (date) =>
      date.getUTCFullYear() === dates[0]!.getUTCFullYear() &&
      date.getUTCMonth() === dates[0]!.getUTCMonth(),
  );

  if (sameMonth) {
    const dayList = dates
      .map((date) => formatOrdinalDay(date.getUTCDate()))
      .join(", ");
    const month = dates[0]!.toLocaleDateString("en-GB", {
      month: "long",
      timeZone: "UTC",
    });
    return `${dayList} of ${month}`;
  }

  return dates
    .map((date) => {
      const day = formatOrdinalDay(date.getUTCDate());
      const month = date.toLocaleDateString("en-GB", {
        month: "short",
        timeZone: "UTC",
      });
      return `${day} ${month}`;
    })
    .join(", ");
}

/** Banner copy for a plan hand-off, e.g. "Meals setup for 14th Jun (1 meal)." */
export function formatPlanCookSessionBanner(params: {
  dateKeys: string[];
  mealCount: number;
}): string {
  const mealWord = params.mealCount === 1 ? "meal" : "meals";
  const mealPart = `(${params.mealCount} ${mealWord})`;
  const dates = formatPlanCookSessionDates(params.dateKeys);
  if (dates) {
    return `Meals setup for ${dates} ${mealPart}.`;
  }
  return `Meals setup for your meal plan ${mealPart}.`;
}
