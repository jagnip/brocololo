import { describe, expect, it } from "vitest";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  buildCookingForSummary,
  formatCookingForSummaryLines,
  isAdvancedAudienceActive,
} from "@/lib/recipes/cooking-for-summary";
import { formatPersonMealSummary } from "@/lib/recipes/cook-session-portions";

const J = "family-self";
const N = "family-member-1";

const familyMembers: FamilyMemberRow[] = [
  { id: J, name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: N, name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 2 },
];

describe("cooking-for-summary", () => {
  it("groups identical audiences", () => {
    const groups = buildCookingForSummary(
      [
        [J, N],
        [J, N],
        [J, N],
        [J],
        [J],
        [J],
      ],
      familyMembers,
    );
    expect(groups).toEqual([
      { count: 3, memberIds: [J, N] },
      { count: 3, memberIds: [J] },
    ]);
    expect(formatCookingForSummaryLines(groups, familyMembers)).toBe(
      "3 meals for Jagoda & Nelson · 3 meals for Jagoda",
    );
  });

  it("detects advanced audience vs basic", () => {
    expect(
      isAdvancedAudienceActive(
        [
          [J, N],
          [J],
        ],
        [J, N],
      ),
    ).toBe(true);
    expect(isAdvancedAudienceActive([[J, N], [N, J]], [J, N])).toBe(false);
  });

  it("formats applied person meal summary", () => {
    expect(
      formatPersonMealSummary(
        new Map([
          [J, 6],
          [N, 3],
        ]),
        familyMembers,
      ),
    ).toBe("Jagoda · 6 meals · Nelson · 3 meals");
  });
});
