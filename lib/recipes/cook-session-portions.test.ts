import { describe, expect, it } from "vitest";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  addMemberToAllMeals,
  audienceKey,
  deriveBatchPortionWeights,
  deriveCookingUnionIds,
  derivePersonMealCounts,
  formatPersonMealSummary,
  isAdvancedDraftDifferentFromBasic,
  removeMemberFromAllMeals,
  resizePerMealAudience,
  seedPerMealAudience,
} from "@/lib/recipes/cook-session-portions";

const J = "family-self";
const N = "family-member-1";

const familyMembers: FamilyMemberRow[] = [
  { id: J, name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: N, name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 2 },
];

describe("derivePersonMealCounts", () => {
  it("counts 3 J+N + 3 J meals", () => {
    const perMeal = [
      [J, N],
      [J, N],
      [J, N],
      [J],
      [J],
      [J],
    ];
    const counts = derivePersonMealCounts(perMeal);
    expect(counts.get(J)).toBe(6);
    expect(counts.get(N)).toBe(3);
  });

  it("treats duplicate ids in one meal as a set", () => {
    const counts = derivePersonMealCounts([[J, J, N]]);
    expect(counts.get(J)).toBe(1);
    expect(counts.get(N)).toBe(1);
  });

  it("returns empty map for empty meal list", () => {
    expect(derivePersonMealCounts([]).size).toBe(0);
  });
});

describe("deriveCookingUnionIds", () => {
  it("returns household-ordered union", () => {
    expect(
      deriveCookingUnionIds(
        [
          [N],
          [J, N],
        ],
        familyMembers,
      ),
    ).toEqual([J, N]);
  });
});

describe("deriveBatchPortionWeights", () => {
  it("uses meals × multiplier (J 3 / N 9 → 25% / 75%)", () => {
    const counts = new Map([
      [J, 3],
      [N, 9],
    ]);
    const weights = deriveBatchPortionWeights(
      counts,
      familyMembers,
      [
        { familyMemberId: J, multiplier: 1 },
        { familyMemberId: N, multiplier: 1 },
      ],
    );
    expect(weights).toEqual([
      { familyMemberId: J, mealCount: 3, multiplier: 1, weight: 3 },
      { familyMemberId: N, mealCount: 9, multiplier: 1, weight: 9 },
    ]);
    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    expect(weights[0]!.weight / total).toBe(0.25);
    expect(weights[1]!.weight / total).toBe(0.75);
  });

  it("applies portion multipliers (J 6×1, N 3×2 → 50/50)", () => {
    const counts = new Map([
      [J, 6],
      [N, 3],
    ]);
    const weights = deriveBatchPortionWeights(
      counts,
      familyMembers,
      [
        { familyMemberId: J, multiplier: 1 },
        { familyMemberId: N, multiplier: 2 },
      ],
    );
    expect(weights.map((entry) => entry.weight)).toEqual([6, 6]);
  });
});

describe("isAdvancedDraftDifferentFromBasic", () => {
  it("is false when all meals match basic and extras are 0", () => {
    expect(
      isAdvancedDraftDifferentFromBasic({
        perMealAudience: [
          [J, N],
          [N, J],
        ],
        cookingFamilyMemberIds: [J, N],
        extraPortions: 0,
      }),
    ).toBe(false);
  });

  it("is true when extras > 0", () => {
    expect(
      isAdvancedDraftDifferentFromBasic({
        perMealAudience: [[J, N]],
        cookingFamilyMemberIds: [J, N],
        extraPortions: 2,
      }),
    ).toBe(true);
  });

  it("is true when a meal audience differs", () => {
    expect(
      isAdvancedDraftDifferentFromBasic({
        perMealAudience: [[J, N], [J]],
        cookingFamilyMemberIds: [J, N],
        extraPortions: 0,
      }),
    ).toBe(true);
  });
});

describe("formatPersonMealSummary", () => {
  it("formats Jagoda · 6 meals · Nelson · 3 meals", () => {
    const counts = new Map([
      [J, 6],
      [N, 3],
    ]);
    expect(formatPersonMealSummary(counts, familyMembers)).toBe(
      "Jagoda · 6 meals · Nelson · 3 meals",
    );
  });
});

describe("meal audience mutations", () => {
  it("seeds N meals from basic selection", () => {
    expect(seedPerMealAudience(3, [J, N])).toEqual([
      [J, N],
      [J, N],
      [J, N],
    ]);
  });

  it("appends meals with selected people and drops trailing", () => {
    const current = [[J], [J]];
    expect(resizePerMealAudience(current, 4, [J, N])).toEqual([
      [J],
      [J],
      [J, N],
      [J, N],
    ]);
    expect(resizePerMealAudience(current, 1, [J, N])).toEqual([[J]]);
  });

  it("adds a member to every meal", () => {
    expect(addMemberToAllMeals([[J], [J, N]], N)).toEqual([
      [J, N],
      [J, N],
    ]);
  });

  it("removes a member but never leaves a meal empty", () => {
    expect(removeMemberFromAllMeals([[J, N], [N]], N)).toEqual([[J], [N]]);
  });
});

describe("audienceKey", () => {
  it("ignores order and duplicates", () => {
    expect(audienceKey([N, J, J])).toBe(audienceKey([J, N]));
  });
});
