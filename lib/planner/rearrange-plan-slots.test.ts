import { describe, expect, it } from "vitest";
import { PlannerMealType } from "@/src/generated/enums";
import { getPlanSlotKey } from "@/lib/planner/helpers";
import { rearrangePlanSlots } from "@/lib/planner/rearrange-plan-slots";
import type { PlanInputType, SlotInputType } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";

function createRecipe(
  id: string,
  overrides: Partial<RecipeType> = {},
): RecipeType {
  return {
    id,
    name: id,
    slug: id,
    isBatchRecipe: false,
    plannedMealCount: 1,
    ...overrides,
  } as RecipeType;
}

function slot(
  dateIso: string,
  mealType: PlannerMealType,
  overrides: Partial<SlotInputType> = {},
): SlotInputType {
  return {
    date: new Date(dateIso),
    mealType,
    recipe: null,
    customMeal: null,
    alternatives: [],
    used: false,
    cookingFamilyMemberIds: [],
    batchGroupId: null,
    ...overrides,
  };
}

const DAY_A = "2026-03-17T00:00:00.000Z";
const DAY_B = "2026-03-18T00:00:00.000Z";

describe("rearrangePlanSlots", () => {
  it("moves a filled meal into an empty slot and clears the source", () => {
    const pasta = createRecipe("pasta");
    const source = slot(DAY_A, PlannerMealType.LUNCH, {
      id: "slot-a-lunch",
      recipe: pasta,
      cookingFamilyMemberIds: ["fm-1"],
      used: true,
      batchGroupId: "batch-1",
      alternatives: [createRecipe("alt")],
    });
    const target = slot(DAY_B, PlannerMealType.DINNER, {
      id: "slot-b-dinner",
    });
    const plan: PlanInputType = [source, target];

    const next = rearrangePlanSlots(
      plan,
      getPlanSlotKey(source),
      getPlanSlotKey(target),
    );

    const nextSource = next.find((s) => s.id === "slot-a-lunch")!;
    const nextTarget = next.find((s) => s.id === "slot-b-dinner")!;

    // Calendar identity stays put.
    expect(nextSource.date.toISOString()).toBe(DAY_A);
    expect(nextSource.mealType).toBe(PlannerMealType.LUNCH);
    expect(nextTarget.date.toISOString()).toBe(DAY_B);
    expect(nextTarget.mealType).toBe(PlannerMealType.DINNER);

    // Meal traveled; source cleared.
    expect(nextSource.recipe).toBeNull();
    expect(nextSource.customMeal).toBeNull();
    expect(nextSource.alternatives).toEqual([]);
    expect(nextSource.cookingFamilyMemberIds).toEqual([]);
    expect(nextSource.used).toBe(false);
    expect(nextSource.batchGroupId).toBeNull();

    expect(nextTarget.recipe).toBe(pasta);
    expect(nextTarget.cookingFamilyMemberIds).toEqual(["fm-1"]);
    expect(nextTarget.used).toBe(true);
    expect(nextTarget.batchGroupId).toBe("batch-1");
    expect(nextTarget.alternatives).toHaveLength(1);
  });

  it("swaps movable meal fields between two filled slots", () => {
    const pasta = createRecipe("pasta");
    const salad = createRecipe("salad");
    const source = slot(DAY_A, PlannerMealType.BREAKFAST, {
      id: "a",
      recipe: pasta,
      cookingFamilyMemberIds: ["fm-1"],
      used: true,
      batchGroupId: "g-pasta",
    });
    const target = slot(DAY_B, PlannerMealType.LUNCH, {
      id: "b",
      recipe: salad,
      cookingFamilyMemberIds: ["fm-2"],
      used: false,
      batchGroupId: "g-salad",
      alternatives: [createRecipe("alt-salad")],
    });
    const plan: PlanInputType = [source, target];

    const next = rearrangePlanSlots(
      plan,
      getPlanSlotKey(source),
      getPlanSlotKey(target),
    );

    const nextA = next.find((s) => s.id === "a")!;
    const nextB = next.find((s) => s.id === "b")!;

    expect(nextA.mealType).toBe(PlannerMealType.BREAKFAST);
    expect(nextB.mealType).toBe(PlannerMealType.LUNCH);

    expect(nextA.recipe).toBe(salad);
    expect(nextA.cookingFamilyMemberIds).toEqual(["fm-2"]);
    expect(nextA.used).toBe(false);
    expect(nextA.batchGroupId).toBe("g-salad");
    expect(nextA.alternatives).toHaveLength(1);

    expect(nextB.recipe).toBe(pasta);
    expect(nextB.cookingFamilyMemberIds).toEqual(["fm-1"]);
    expect(nextB.used).toBe(true);
    expect(nextB.batchGroupId).toBe("g-pasta");
  });

  it("moves a custom meal into an empty slot", () => {
    const source = slot(DAY_A, PlannerMealType.DINNER, {
      id: "custom-src",
      customMeal: {
        name: "Leftovers",
        ingredients: [{ ingredientId: "i1", unitId: "u1", amount: 1 }],
      },
      cookingFamilyMemberIds: ["fm-1"],
    });
    const target = slot(DAY_B, PlannerMealType.BREAKFAST, { id: "empty" });
    const plan: PlanInputType = [source, target];

    const next = rearrangePlanSlots(
      plan,
      getPlanSlotKey(source),
      getPlanSlotKey(target),
    );

    expect(next.find((s) => s.id === "custom-src")!.customMeal).toBeNull();
    expect(next.find((s) => s.id === "empty")!.customMeal?.name).toBe(
      "Leftovers",
    );
  });

  it("returns the same plan when source and target keys match", () => {
    const filled = slot(DAY_A, PlannerMealType.LUNCH, {
      recipe: createRecipe("r"),
    });
    const plan: PlanInputType = [filled];
    const key = getPlanSlotKey(filled);

    expect(rearrangePlanSlots(plan, key, key)).toBe(plan);
  });

  it("returns the same plan when a key is missing", () => {
    const filled = slot(DAY_A, PlannerMealType.LUNCH, {
      recipe: createRecipe("r"),
    });
    const plan: PlanInputType = [filled];

    expect(
      rearrangePlanSlots(plan, getPlanSlotKey(filled), "missing-key"),
    ).toBe(plan);
  });

  it("returns the same plan when the source slot is empty", () => {
    const empty = slot(DAY_A, PlannerMealType.LUNCH);
    const filled = slot(DAY_B, PlannerMealType.DINNER, {
      recipe: createRecipe("r"),
    });
    const plan: PlanInputType = [empty, filled];

    expect(
      rearrangePlanSlots(
        plan,
        getPlanSlotKey(empty),
        getPlanSlotKey(filled),
      ),
    ).toBe(plan);
  });

  it("does not move batch siblings — only the dragged slot's batchGroupId travels", () => {
    const recipe = createRecipe("batch-chili", { isBatchRecipe: true });
    const day1 = slot(DAY_A, PlannerMealType.DINNER, {
      id: "d1",
      recipe,
      batchGroupId: "g1",
    });
    const day2 = slot(DAY_B, PlannerMealType.DINNER, {
      id: "d2",
      recipe,
      batchGroupId: "g1",
    });
    const emptyLunch = slot(DAY_A, PlannerMealType.LUNCH, { id: "lunch" });
    const plan: PlanInputType = [day1, day2, emptyLunch];

    const next = rearrangePlanSlots(
      plan,
      getPlanSlotKey(day1),
      getPlanSlotKey(emptyLunch),
    );

    expect(next.find((s) => s.id === "d1")!.recipe).toBeNull();
    expect(next.find((s) => s.id === "lunch")!.batchGroupId).toBe("g1");
    // Sibling stays put with the same group id.
    expect(next.find((s) => s.id === "d2")!.recipe).toBe(recipe);
    expect(next.find((s) => s.id === "d2")!.batchGroupId).toBe("g1");
  });
});
