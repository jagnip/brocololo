import type { FamilyMemberRow } from "@/lib/db/family-members";
import { getSortedFamilyMembers } from "@/lib/recipes/helpers";

/** Track tab and log surfaces scoped to who the plan was generated for. */
export function filterFamilyMembersToPlanAudience(
  all: FamilyMemberRow[],
  audienceIds: string[],
): FamilyMemberRow[] {
  if (audienceIds.length === 0) {
    return [];
  }
  const audienceIdSet = new Set(audienceIds);
  return getSortedFamilyMembers(all).filter((member) =>
    audienceIdSet.has(member.id),
  );
}
