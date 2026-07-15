import { describe, expect, it } from "vitest";
import { calculateNutritionPerServing } from "@/lib/recipes/helpers";
import { buildDraftRecipeForNutrition } from "@/lib/recipes/build-draft-recipe-for-nutrition";
import {
  createMockIngredient,
  createMockIngredientUnit,
} from "../tests/test-helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";

const chicken = createMockIngredient({
  id: "ing-chicken",
  calories: 165,
  proteins: 31,
  fats: 3.6,
  carbs: 0,
  unitConversions: [createMockIngredientUnit("ing-chicken", "unit-grams", 1)],
});

const familyMembers: FamilyMemberRow[] = [
  { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: "family-member-1", name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 2 },
];

function formRowFrom(
  overrides: Partial<{
    tempIngredientKey: string;
    ingredientId: string;
    amount: number | null | undefined;
    unitId: string | null | undefined;
    position: number;
  }> & { tempIngredientKey: string; ingredientId: string },
) {
  return {
    tempIngredientKey: overrides.tempIngredientKey,
    ingredientId: overrides.ingredientId,
    amount: overrides.amount ?? null,
    unitId: overrides.unitId ?? null,
    memberAdjustments: [] as [],
    additionalInfo: null as string | null,
    groupTempKey: null as string | null,
    position: overrides.position ?? 0,
  };
}

describe("buildDraftRecipeForNutrition", () => {
  it("drops placeholder rows without ingredientId and rows missing catalog match", () => {
    const draft = buildDraftRecipeForNutrition(
      2,
      [
        formRowFrom({
          tempIngredientKey: "tmp-1",
          ingredientId: "",
          amount: 100,
          unitId: "unit-grams",
        }),
        formRowFrom({
          tempIngredientKey: "tmp-2",
          ingredientId: "missing",
          amount: 100,
          unitId: "unit-grams",
        }),
      ],
      [chicken],
      familyMembers,
    );

    expect(draft.ingredients).toHaveLength(0);
  });

  it("builds equal per-person nutrition from batch servings", () => {
    const draft = buildDraftRecipeForNutrition(
      2,
      [
        formRowFrom({
          tempIngredientKey: "tmp-chicken",
          ingredientId: "ing-chicken",
          amount: 200,
          unitId: "unit-grams",
        }),
      ],
      [chicken],
      familyMembers,
    );

    const jagoda = calculateNutritionPerServing(
      draft,
      "family-self",
      familyMembers,
      [chicken],
    );
    const nelson = calculateNutritionPerServing(
      draft,
      "family-member-1",
      familyMembers,
      [chicken],
    );

    expect(jagoda.calories).toBe(165);
    expect(nelson.calories).toBe(165);
  });
});
