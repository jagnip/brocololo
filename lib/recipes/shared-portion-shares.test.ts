import { describe, expect, it } from "vitest";
import {
  getDisplayPercentages,
  getSharedPortionShares,
} from "./shared-portion-shares";

const twoPersonAudience = [
  { id: "self", isSelf: true, sortOrder: 0 },
  { id: "partner", isSelf: false, sortOrder: 1 },
];

const threePersonAudience = [
  { id: "self", isSelf: true, sortOrder: 0 },
  { id: "partner", isSelf: false, sortOrder: 1 },
  { id: "child", isSelf: false, sortOrder: 2 },
];

describe("getSharedPortionShares", () => {
  it("returns empty array for a single audience member", () => {
    expect(
      getSharedPortionShares(
        [{ id: "self", isSelf: true, sortOrder: 0 }],
        [],
      ),
    ).toEqual([]);
  });

  it("returns empty array when audience is empty", () => {
    expect(getSharedPortionShares([], [])).toEqual([]);
  });

  it("splits 1:2 multipliers as 33% / 67% (legacy two-person chart)", () => {
    const shares = getSharedPortionShares(twoPersonAudience, [
      { familyMemberId: "partner", multiplier: 2 },
    ]);

    expect(shares).toHaveLength(2);
    expect(shares[0].familyMemberId).toBe("self");
    expect(shares[0].share).toBeCloseTo(1 / 3, 5);
    expect(shares[0].multiplier).toBe(1);
    expect(shares[1].familyMemberId).toBe("partner");
    expect(shares[1].share).toBeCloseTo(2 / 3, 5);
    expect(shares[1].multiplier).toBe(2);
  });

  it("defaults missing memberPortions rows to multiplier 1", () => {
    const shares = getSharedPortionShares(twoPersonAudience, []);

    expect(shares[0].share).toBeCloseTo(0.5, 5);
    expect(shares[1].share).toBeCloseTo(0.5, 5);
    expect(shares[0].multiplier).toBe(1);
    expect(shares[1].multiplier).toBe(1);
  });

  it("matches three-person 1 : 1.5 : 1 split from log helpers", () => {
    const shares = getSharedPortionShares(threePersonAudience, [
      { familyMemberId: "partner", multiplier: 1.5 },
      { familyMemberId: "child", multiplier: 1 },
    ]);

    expect(shares.map((entry) => entry.share)).toEqual([
      expect.closeTo(100 / 350, 5),
      expect.closeTo(150 / 350, 5),
      expect.closeTo(100 / 350, 5),
    ]);
    expect(shares.reduce((sum, entry) => sum + entry.share, 0)).toBeCloseTo(1, 8);
  });

  it("orders shares by sortOrder", () => {
    const shares = getSharedPortionShares(
      [
        { id: "child", isSelf: false, sortOrder: 2 },
        { id: "self", isSelf: true, sortOrder: 0 },
        { id: "partner", isSelf: false, sortOrder: 1 },
      ],
      [{ familyMemberId: "partner", multiplier: 2 }],
    );

    expect(shares.map((entry) => entry.familyMemberId)).toEqual([
      "self",
      "partner",
      "child",
    ]);
  });
});

describe("getDisplayPercentages", () => {
  it("sums rounded percentages to 100", () => {
    const shares = getSharedPortionShares(twoPersonAudience, [
      { familyMemberId: "partner", multiplier: 2 },
    ]);
    const percentages = getDisplayPercentages(shares);

    expect(percentages).toEqual([33, 67]);
    expect(percentages.reduce((sum, value) => sum + value, 0)).toBe(100);
  });
});
