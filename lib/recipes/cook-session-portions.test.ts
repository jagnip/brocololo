import { describe, expect, it } from "vitest";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import {
  clampCombinationCount,
  createDefaultCombinations,
  deriveBatchPortionWeights,
  deriveCookingUnionIds,
  derivePersonMealCounts,
  expandCombinationsToPerMealAudience,
  formatPersonMealSummary,
  isAdvancedDraftDifferentFromBasic,
  toggleCombinationMember,
  totalMealCountFromCombinations,
} from "@/lib/recipes/cook-session-portions";

const J = "family-self";
const N = "family-member-1";

const familyMembers: FamilyMemberRow[] = [
  { id: J, name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: N, name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 2 },
];

describe("expandCombinationsToPerMealAudience", () => {
  it("expands 2×[J] + 1×[J,N] into three meal audiences", () => {
    expect(
      expandCombinationsToPerMealAudience([
        { count: 2, memberIds: [J] },
        { count: 1, memberIds: [J, N] },
      ]),
    ).toEqual([[J], [J], [J, N]]);
  });
});

describe("totalMealCountFromCombinations", () => {
  it("sums combination counts", () => {
    expect(
      totalMealCountFromCombinations([
        { count: 2, memberIds: [J] },
        { count: 1, memberIds: [J, N] },
      ]),
    ).toBe(3);
  });
});

describe("createDefaultCombinations", () => {
  it("seeds one meal for the given people", () => {
    expect(createDefaultCombinations([J, N])).toEqual([
      { count: 1, memberIds: [J, N] },
    ]);
  });
});

describe("toggleCombinationMember", () => {
  it("adds and removes, but never leaves empty", () => {
    expect(toggleCombinationMember([J], N)).toEqual([J, N]);
    expect(toggleCombinationMember([J, N], N)).toEqual([J]);
    expect(toggleCombinationMember([J], J)).toEqual([J]);
  });
});

describe("clampCombinationCount", () => {
  it("keeps counts in 1..99", () => {
    expect(clampCombinationCount(0)).toBe(1);
    expect(clampCombinationCount(3)).toBe(3);
    expect(clampCombinationCount(200)).toBe(99);
  });
});

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
  it("is false for a single combination with no extras", () => {
    expect(
      isAdvancedDraftDifferentFromBasic({
        combinations: [{ count: 3, memberIds: [J, N] }],
        extraPortions: 0,
      }),
    ).toBe(false);
  });

  it("is true for multiple combinations or extras", () => {
    expect(
      isAdvancedDraftDifferentFromBasic({
        combinations: [
          { count: 2, memberIds: [J] },
          { count: 1, memberIds: [J, N] },
        ],
        extraPortions: 0,
      }),
    ).toBe(true);
    expect(
      isAdvancedDraftDifferentFromBasic({
        combinations: [{ count: 1, memberIds: [J, N] }],
        extraPortions: 2,
      }),
    ).toBe(true);
  });
});

describe("formatPersonMealSummary", () => {
  it("formats Jagoda · 6 portions · Nelson · 3 portions", () => {
    const counts = new Map([
      [J, 6],
      [N, 3],
    ]);
    expect(formatPersonMealSummary(counts, familyMembers)).toBe(
      "Jagoda · 6 portions · Nelson · 3 portions",
    );
  });
});
