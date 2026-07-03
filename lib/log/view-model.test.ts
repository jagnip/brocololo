import { describe, expect, it } from "vitest";
import { LogMealType } from "@/src/generated/enums";
import {
  buildGroupedPlannerPoolCards,
  type PlannerPoolCardData,
} from "@/lib/log/view-model";
import {
  toPlanIdeaMealOptionId,
  toRepositoryMealOptionId,
} from "@/lib/log/meal-selector-options";

function poolItem(
  overrides: Partial<PlannerPoolCardData> & Pick<PlannerPoolCardData, "planSlotId">,
): PlannerPoolCardData {
  return {
    id: `plan-${overrides.planSlotId}`,
    date: new Date("2026-03-17T00:00:00.000Z"),
    dateKey: "2026-03-17",
    mealType: LogMealType.DINNER,
    mealLabel: "Dinner",
    title: "Chicken curry",
    sourceRecipeId: "recipe-1",
    imageUrl: null,
    ingredients: [],
    ...overrides,
  };
}

describe("buildGroupedPlannerPoolCards", () => {
  it("groups duplicate repository recipes into one card with a count", () => {
    const grouped = buildGroupedPlannerPoolCards([
      poolItem({ planSlotId: "slot-1" }),
      poolItem({ planSlotId: "slot-2", date: new Date("2026-03-18T00:00:00.000Z"), dateKey: "2026-03-18" }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      id: toRepositoryMealOptionId("recipe-1"),
      planSlotId: "slot-1",
      count: 2,
    });
  });

  it("groups duplicate idea meals by name into one card with a count", () => {
    const grouped = buildGroupedPlannerPoolCards([
      poolItem({
        planSlotId: "slot-1",
        sourceRecipeId: null,
        title: "Pasta from insta",
      }),
      poolItem({
        planSlotId: "slot-2",
        sourceRecipeId: null,
        title: "Pasta from insta",
        date: new Date("2026-03-18T00:00:00.000Z"),
        dateKey: "2026-03-18",
      }),
    ]);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toMatchObject({
      id: toPlanIdeaMealOptionId("Pasta from insta"),
      planSlotId: "slot-1",
      title: "Pasta from insta",
      count: 2,
    });
  });

  it("keeps different meals as separate cards", () => {
    const grouped = buildGroupedPlannerPoolCards([
      poolItem({ planSlotId: "slot-1", title: "Meal A", sourceRecipeId: "recipe-a" }),
      poolItem({ planSlotId: "slot-2", title: "Meal B", sourceRecipeId: "recipe-b" }),
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped.map((item) => item.count)).toEqual([1, 1]);
  });
});
