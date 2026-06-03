import { describe, expect, it } from "vitest";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { filterFamilyMembersToPlanAudience } from "./plan-audience";

const household: FamilyMemberRow[] = [
  { id: "self", name: "You", isSelf: true, sortOrder: 0 },
  { id: "partner", name: "Partner", isSelf: false, sortOrder: 1 },
  { id: "child", name: "Child", isSelf: false, sortOrder: 2 },
];

describe("filterFamilyMembersToPlanAudience", () => {
  it("returns only members in plan audience, preserving sort order", () => {
    expect(
      filterFamilyMembersToPlanAudience(household, ["partner", "self"]),
    ).toEqual([
      household[0],
      household[1],
    ]);
  });

  it("returns empty when audience ids are empty", () => {
    expect(filterFamilyMembersToPlanAudience(household, [])).toEqual([]);
  });

  it("ignores ids not in the household", () => {
    expect(
      filterFamilyMembersToPlanAudience(household, ["self", "unknown"]),
    ).toEqual([household[0]]);
  });
});
