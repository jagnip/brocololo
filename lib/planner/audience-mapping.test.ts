import { describe, expect, it } from "vitest";
import {
  createDefaultAudienceGroups,
  mapGroupAudienceToDaily,
  mergeDailyAudienceByDate,
  getSlotAudienceIdsForMeal,
} from "@/lib/planner/audience-mapping";

describe("audience-mapping", () => {
  const familyIds = ["fm-1", "fm-2"];

  it("defaults breakfasts and weekday lunches to the solo member, with shared weekend lunches and dinners", () => {
    const groups = createDefaultAudienceGroups(familyIds, "fm-1");
    for (const group of [groups.weekday, groups.weekend]) {
      expect(group.breakfastFamilyMemberIds).toEqual(["fm-1"]);
      expect(group.dinnerFamilyMemberIds).toEqual(familyIds);
    }
    expect(groups.weekday.lunchFamilyMemberIds).toEqual(["fm-1"]);
    expect(groups.weekend.lunchFamilyMemberIds).toEqual(familyIds);
    const daily = mapGroupAudienceToDaily([
      new Date("2026-07-06T12:00:00.000Z"),
      new Date("2026-07-11T12:00:00.000Z"),
    ], groups);
    for (const day of daily) {
      expect(day.breakfastFamilyMemberIds).toEqual(["fm-1"]);
      expect(day.dinnerFamilyMemberIds).toEqual(familyIds);
    }
    expect(daily[0]?.lunchFamilyMemberIds).toEqual(["fm-1"]);
    expect(daily[1]?.lunchFamilyMemberIds).toEqual(familyIds);
  });

  it("keeps solo meal audience defaults independent when edited", () => {
    const groups = createDefaultAudienceGroups(familyIds, "fm-1");
    groups.weekday.breakfastFamilyMemberIds.push("fm-2");
    expect(groups.weekday.lunchFamilyMemberIds).toEqual(["fm-1"]);
    expect(groups.weekend.breakfastFamilyMemberIds).toEqual(["fm-1"]);
    expect(groups.weekend.lunchFamilyMemberIds).toEqual(familyIds);
  });

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
