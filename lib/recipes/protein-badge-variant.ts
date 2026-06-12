import {
  PROTEIN_BADGE_GROUPS,
  PROTEIN_GROUP_MAP,
  type ProteinBadgeGroup,
} from "@/lib/constants";

export type ProteinBadgeVariant = ProteinBadgeGroup;

const PROTEIN_BADGE_GROUP_SET = new Set<string>(PROTEIN_BADGE_GROUPS);

function isProteinBadgeGroup(value: string): value is ProteinBadgeGroup {
  return PROTEIN_BADGE_GROUP_SET.has(value);
}

/** Map a protein category slug to a pastel badge group (via PROTEIN_GROUP_MAP). */
export function getProteinBadgeVariant(slug: string): ProteinBadgeVariant {
  const groupKey = PROTEIN_GROUP_MAP[slug] ?? slug;
  if (isProteinBadgeGroup(groupKey)) {
    return groupKey;
  }
  // Unmapped slugs land in vegetarian until added to PROTEIN_GROUP_MAP.
  return "vegetarian";
}
