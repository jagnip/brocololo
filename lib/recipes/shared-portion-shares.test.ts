import { describe, expect, it } from "vitest";
import {
  getBatchPortionShares,
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
