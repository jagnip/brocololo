import { describe, expect, it } from "vitest";
import {
  getIngredientMemberBadges,
  getRecipeFamilyMemberLabel,
  hasHouseholdFamilyFeatures,
} from "@/lib/recipes/helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";

const household: FamilyMemberRow[] = [
  { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0 },
  { id: "family-member-1", name: "", isSelf: false, sortOrder: 1 },
];

describe("ingredient member badges helpers", () => {
  it("detects when family features should be shown", () => {
    expect(hasHouseholdFamilyFeatures(household)).toBe(true);
    expect(hasHouseholdFamilyFeatures([household[0]!])).toBe(false);
  });

  it("falls back to Family member index when name is empty", () => {
    expect(getRecipeFamilyMemberLabel(household[1]!, household)).toBe("Family member 1");
  });

  it("returns badges in sort order for targeted ingredients", () => {
    const badges = getIngredientMemberBadges(
      {
        appliesToEveryone: false,
        memberTargets: [
          { familyMemberId: "family-member-1" },
          { familyMemberId: "family-self" },
        ],
      },
      household,
    );
    expect(badges.map((badge) => badge.label)).toEqual(["Jagoda", "Family member 1"]);
  });

  it("returns no badges for everyone or solo household", () => {
    expect(
      getIngredientMemberBadges(
        { appliesToEveryone: true, memberTargets: [] },
        household,
      ),
    ).toEqual([]);
    expect(
      getIngredientMemberBadges(
        {
          appliesToEveryone: false,
          memberTargets: [{ familyMemberId: "family-self" }],
        },
        [household[0]!],
      ),
    ).toEqual([]);
  });
});
