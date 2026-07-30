import type { CookingCombination } from "@/lib/recipes/cook-session-portions";
import { clampCombinationCount } from "@/lib/recipes/cook-session-portions";

/**
 * Encode cooking combinations for a planner → recipe hand-off.
 * Format: `id1,id2:count;id3:count` (empty member list allowed → household default on decode).
 */
export function encodePlanCookParam(
  combinations: CookingCombination[],
): string {
  return combinations
    .map((combination) => {
      const members = combination.memberIds.join(",");
      const count = clampCombinationCount(combination.count);
      return `${members}:${count}`;
    })
    .join(";");
}

/**
 * Decode a `cook` query value into combinations.
 * Never throws — returns null on any malformed input so callers fall back to defaults.
 */
export function decodePlanCookParam(
  value: string,
  currentHouseholdMemberIds: string[],
): CookingCombination[] | null {
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

  const householdSet = new Set(currentHouseholdMemberIds);
  const segments = raw.split(";");
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

  return combinations.length > 0 ? combinations : null;
}
