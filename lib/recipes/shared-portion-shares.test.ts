import { describe, expect, it } from "vitest";
import {
  COOK_SESSION_EXTRAS_SHARE_ID,
  getBatchPortionShares,
  getCookSessionPortionShares,
  getDisplayPercentages,
  getSharedPortionShares,
} from "@/lib/recipes/shared-portion-shares";

const members = [
  { id: "family-self", isSelf: true, sortOrder: 0 },
  { id: "family-member-1", isSelf: false, sortOrder: 1 },
];

const portions = [
  { familyMemberId: "family-self", multiplier: 1 },
  { familyMemberId: "family-member-1", multiplier: 2 },
];

describe("getSharedPortionShares", () => {
  it("splits by multiplier only (legacy one-meal pie)", () => {
    const shares = getSharedPortionShares(members, portions);
    expect(shares.map((entry) => entry.share)).toEqual([1 / 3, 2 / 3]);
  });
});

describe("getBatchPortionShares", () => {
  it("splits J 3 / N 9 portions as 25% / 75%", () => {
    const shares = getBatchPortionShares(
      members,
      [
        { familyMemberId: "family-self", multiplier: 1 },
        { familyMemberId: "family-member-1", multiplier: 1 },
      ],
      new Map([
        ["family-self", 3],
        ["family-member-1", 9],
      ]),
    );
    expect(shares).toHaveLength(2);
    expect(shares[0]).toMatchObject({
      familyMemberId: "family-self",
      share: 0.25,
      weight: 3,
    });
    expect(shares[1]).toMatchObject({
      familyMemberId: "family-member-1",
      share: 0.75,
      weight: 9,
    });
    expect(getDisplayPercentages(shares)).toEqual([25, 75]);
  });

  it("uses meals × multiplier (J 6×1, N 3×2 → 50/50)", () => {
    const shares = getBatchPortionShares(
      members,
      portions,
      new Map([
        ["family-self", 6],
        ["family-member-1", 3],
      ]),
    );
    expect(shares.map((entry) => entry.weight)).toEqual([6, 6]);
    expect(shares.map((entry) => entry.share)).toEqual([0.5, 0.5]);
  });

  it("hides pie when only one person has weight", () => {
    expect(
      getBatchPortionShares(
        members,
        portions,
        new Map([["family-self", 6]]),
      ),
    ).toEqual([]);
  });
});

describe("getCookSessionPortionShares", () => {
  it("returns a full slice for a single person", () => {
    const shares = getCookSessionPortionShares({
      audienceMembers: [members[0]!],
      memberPortions: portions,
      personMealCounts: new Map([["family-self", 5]]),
    });
    expect(shares).toEqual([
      {
        familyMemberId: "family-self",
        share: 1,
        multiplier: 1,
        weight: 5,
      },
    ]);
  });

  it("adds anonymous extras as a grey-slice weight", () => {
    const shares = getCookSessionPortionShares({
      audienceMembers: [members[0]!],
      memberPortions: portions,
      personMealCounts: new Map([["family-self", 5]]),
      extraPortions: 3,
    });
    expect(shares).toHaveLength(2);
    expect(shares[0]).toMatchObject({
      familyMemberId: "family-self",
      weight: 5,
      share: 5 / 8,
    });
    expect(shares[1]).toMatchObject({
      familyMemberId: COOK_SESSION_EXTRAS_SHARE_ID,
      weight: 3,
      share: 3 / 8,
      multiplier: 1,
    });
  });

  it("matches getBatchPortionShares when there are 2+ people and no extras", () => {
    const mealCounts = new Map([
      ["family-self", 6],
      ["family-member-1", 3],
    ]);
    expect(
      getCookSessionPortionShares({
        audienceMembers: members,
        memberPortions: portions,
        personMealCounts: mealCounts,
      }),
    ).toEqual(getBatchPortionShares(members, portions, mealCounts));
  });

  it("includes extras alongside multi-person weights", () => {
    const shares = getCookSessionPortionShares({
      audienceMembers: members,
      memberPortions: [
        { familyMemberId: "family-self", multiplier: 1 },
        { familyMemberId: "family-member-1", multiplier: 1 },
      ],
      personMealCounts: new Map([
        ["family-self", 5],
        ["family-member-1", 5],
      ]),
      extraPortions: 2,
    });
    // 5 + 5 + 2 = 12
    expect(shares.map((entry) => entry.weight)).toEqual([5, 5, 2]);
    expect(shares[2]?.familyMemberId).toBe(COOK_SESSION_EXTRAS_SHARE_ID);
    expect(getDisplayPercentages(shares)).toEqual([42, 42, 16]);
  });

  it("returns empty when there are no people and no extras", () => {
    expect(
      getCookSessionPortionShares({
        audienceMembers: members,
        memberPortions: portions,
        personMealCounts: new Map(),
        extraPortions: 0,
      }),
    ).toEqual([]);
  });
});
