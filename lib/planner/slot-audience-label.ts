import type { FamilyMemberRow } from "@/lib/db/family-members";

function getMemberLabel(member: FamilyMemberRow, index: number): string {
  return (
    member.name.trim() ||
    (member.isSelf ? "You" : `Family member ${index}`)
  );
}

/** Compact label for per-slot audience multi-select trigger. */
export function formatSlotAudienceLabel(
  memberIds: string[],
  familyMembers: FamilyMemberRow[],
): string {
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length === 0) {
    return "Select people";
  }
  if (uniqueIds.length === 1) {
    const memberIndex = familyMembers.findIndex(
      (member) => member.id === uniqueIds[0],
    );
    if (memberIndex >= 0) {
      return getMemberLabel(familyMembers[memberIndex]!, memberIndex);
    }
    return "1 person";
  }
  return `${uniqueIds.length} people`;
}
