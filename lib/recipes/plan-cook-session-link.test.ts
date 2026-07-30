import { describe, expect, it } from "vitest";
import {
  decodePlanCookParam,
  encodePlanCookParam,
} from "@/lib/recipes/plan-cook-session-link";
import type { CookingCombination } from "@/lib/recipes/cook-session-portions";

const J = "member-jagoda";
const N = "member-nelson";
const HOUSEHOLD = [J, N];

describe("encodePlanCookParam / decodePlanCookParam", () => {
  it("round-trips multi-combination sessions", () => {
    const combinations: CookingCombination[] = [
      { count: 2, memberIds: [J, N] },
      { count: 1, memberIds: [J] },
    ];

    const encoded = encodePlanCookParam(combinations);
    expect(encoded).toBe(`${J},${N}:2;${J}:1`);
    expect(decodePlanCookParam(encoded, HOUSEHOLD)).toEqual(combinations);
  });

  it("resolves empty member segments to the current household", () => {
    expect(decodePlanCookParam(":1", HOUSEHOLD)).toEqual([
      { count: 1, memberIds: HOUSEHOLD },
    ]);
  });

  it("filters unknown member ids and falls back when none remain", () => {
    expect(
      decodePlanCookParam(`${J},deleted-member:1`, HOUSEHOLD),
    ).toEqual([{ count: 1, memberIds: [J] }]);

    expect(
      decodePlanCookParam("deleted-a,deleted-b:2", HOUSEHOLD),
    ).toEqual([{ count: 2, memberIds: HOUSEHOLD }]);
  });

  it("returns null for malformed input", () => {
    expect(decodePlanCookParam("", HOUSEHOLD)).toBeNull();
    expect(decodePlanCookParam("no-colon", HOUSEHOLD)).toBeNull();
    expect(decodePlanCookParam(`${J}:abc`, HOUSEHOLD)).toBeNull();
    expect(decodePlanCookParam(`${J}:0`, HOUSEHOLD)).toBeNull();
    expect(decodePlanCookParam(`${J}:-1`, HOUSEHOLD)).toBeNull();
  });

  it("keeps empty audiences when the household itself is empty", () => {
    const encoded = encodePlanCookParam([{ count: 1, memberIds: [] }]);
    expect(encoded).toBe(":1");
    expect(decodePlanCookParam(encoded, [])).toEqual([
      { count: 1, memberIds: [] },
    ]);
  });

  it("accepts a still-URI-encoded cook value", () => {
    const encoded = encodeURIComponent(`${J},${N}:2`);
    expect(decodePlanCookParam(encoded, HOUSEHOLD)).toEqual([
      { count: 2, memberIds: [J, N] },
    ]);
  });
});
