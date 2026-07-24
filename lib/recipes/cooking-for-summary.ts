import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getFamilyMemberLabel } from "@/components/planner/family-member-multi-select";

export type CookingForAudienceGroup = {
  count: number;
  memberIds: string[];
};

/** Stable key for comparing audiences regardless of toggle order. */
function audienceKey(memberIds: string[]): string {
  return [...memberIds].sort().join(",");
}

/**
 * Groups consecutive/non-consecutive meals that share the same audience set.
 * Order of groups follows first appearance in the meal list.
 */
export function buildCookingForSummary(
  perMealAudience: string[][],
  familyMembers: FamilyMemberRow[],
): CookingForAudienceGroup[] {
  const groups: CookingForAudienceGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const mealIds of perMealAudience) {
    const key = audienceKey(mealIds);
    const existingIndex = indexByKey.get(key);
    if (existingIndex != null) {
      groups[existingIndex].count += 1;
      continue;
    }
    indexByKey.set(key, groups.length);
    // Preserve household sort order for display, not toggle order.
    const orderedIds = familyMembers
      .filter((member) => mealIds.includes(member.id))
      .map((member) => member.id);
    groups.push({ count: 1, memberIds: orderedIds });
  }

  return groups;
}

/** True when any meal's audience differs from the basic cooking selection. */
export function isAdvancedAudienceActive(
  perMealAudience: string[][],
  cookingFamilyMemberIds: string[],
): boolean {
  const basicKey = audienceKey(cookingFamilyMemberIds);
  return perMealAudience.some((mealIds) => audienceKey(mealIds) !== basicKey);
}

/**
 * Builds a readable summary like "3 meals for Jagoda & Nelson · 3 meals for Jagoda".
 */
export function formatCookingForSummaryLines(
  groups: CookingForAudienceGroup[],
  familyMembers: FamilyMemberRow[],
): string {
  const labelById = new Map(
    familyMembers.map((member, index) => [
      member.id,
      getFamilyMemberLabel(member, index),
    ]),
  );

  return groups
    .map((group) => {
      const names = group.memberIds
        .map((id) => labelById.get(id) ?? "Unknown")
        .join(" & ");
      const mealWord = group.count === 1 ? "meal" : "meals";
      return `${group.count} ${mealWord} for ${names}`;
    })
    .join(" · ");
}
