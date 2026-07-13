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
const audience = ["family-self", "family-member-1"];

describe("ingredient member badges helpers", () => {
  it("detects when family features should be shown", () => {
    expect(hasHouseholdFamilyFeatures(household)).toBe(true);
    expect(hasHouseholdFamilyFeatures([household[0]!])).toBe(false);
  });

  it("falls back to Family member index when name is empty", () => {
    expect(getRecipeFamilyMemberLabel(household[1]!, household)).toBe("Family member 1");
  });

  it("returns badges in sort order for skip-exclusive ingredients", () => {
    const badges = getIngredientMemberBadges(
      {
        memberAdjustments: [
          { familyMemberId: "family-self", kind: "SKIP" },
        ],
      },
      household,
      audience,
    );
    expect(badges.map((badge) => badge.label)).toEqual(["Family member 1"]);
  });

  it("returns badges for modify adjustments", () => {
    const badges = getIngredientMemberBadges(
      {
        memberAdjustments: [
          {
            familyMemberId: "family-self",
            kind: "MODIFY",
            ingredientId: "ing-1",
            amount: 1,
            unitId: "unit-1",
            additionalInfo: null,
          },
        ],
      },
      household,
      audience,
    );
    expect(badges.map((badge) => badge.label)).toEqual(["Jagoda"]);
  });

  it("returns no badges for everyone or solo household", () => {
    expect(
      getIngredientMemberBadges({ memberAdjustments: [] }, household, audience),
    ).toEqual([]);
    expect(
      getIngredientMemberBadges(
        {
          memberAdjustments: [
            { familyMemberId: "family-member-1", kind: "SKIP" },
          ],
        },
        [household[0]!],
        ["family-self"],
      ),
    ).toEqual([]);
  });
});
