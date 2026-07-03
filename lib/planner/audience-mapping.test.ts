import { describe, expect, it } from "vitest";
import {
  createDefaultAudienceGroups,
  mapGroupAudienceToDaily,
  mergeDailyAudienceByDate,
  getSlotAudienceIdsForMeal,
} from "@/lib/planner/audience-mapping";

describe("audience-mapping", () => {
  const familyIds = ["fm-1", "fm-2"];

  it("maps grouped weekday/weekend audience to daily rows", () => {
    const groups = createDefaultAudienceGroups(familyIds);
    groups.weekday.breakfastFamilyMemberIds = ["fm-1"];
    groups.weekend.dinnerFamilyMemberIds = ["fm-2"];

    const monday = new Date("2026-07-06T12:00:00.000Z");
    const saturday = new Date("2026-07-11T12:00:00.000Z");
    const daily = mapGroupAudienceToDaily([monday, saturday], groups);

    expect(daily[0]?.breakfastFamilyMemberIds).toEqual(["fm-1"]);
    expect(daily[1]?.dinnerFamilyMemberIds).toEqual(["fm-2"]);
  });

  it("preserves existing daily edits when merging by date", () => {
    const groups = createDefaultAudienceGroups(familyIds);
    const monday = new Date("2026-07-06T12:00:00.000Z");
    const tuesday = new Date("2026-07-07T12:00:00.000Z");
    const previous = [
      {
        date: "2026-07-06",
        breakfastFamilyMemberIds: ["fm-1"],
        lunchFamilyMemberIds: familyIds,
        dinnerFamilyMemberIds: familyIds,
      },
    ];

    const merged = mergeDailyAudienceByDate([monday, tuesday], previous, groups);
    expect(merged[0]?.breakfastFamilyMemberIds).toEqual(["fm-1"]);
    expect(merged[1]?.breakfastFamilyMemberIds).toEqual(familyIds);
  });

  it("reads per-meal audience ids from a daily row", () => {
    const row = {
      date: "2026-07-06",
      breakfastFamilyMemberIds: ["fm-1"],
      lunchFamilyMemberIds: ["fm-2"],
      dinnerFamilyMemberIds: familyIds,
    };

    expect(getSlotAudienceIdsForMeal(row, "LUNCH")).toEqual(["fm-2"]);
  });
});
