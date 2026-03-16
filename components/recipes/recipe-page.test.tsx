import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipePage from "./recipe-page";
import {
  calculateNutritionPerServing,
  getPrimaryCalorieScalingFactorForTarget,
} from "@/lib/recipes/helpers";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipe,
  createMockUnit,
} from "@/lib/tests/test-helpers";
import type { RecipeType } from "@/types/recipe";
import type { IngredientType } from "@/types/ingredient";

function createRecipeFixture(): { recipe: RecipeType; ingredients: IngredientType[] } {
  const gramsUnit = createMockUnit({ id: "unit-grams", name: "grams" });

  const sharedProtein = createMockIngredient({
    id: "ing-shared-protein",
    name: "Shared Protein",
    calories: 100,
    proteins: 10,
    fats: 5,
    carbs: 2,
    unitConversions: [createMockIngredientUnit("ing-shared-protein", "unit-grams", 1, "grams")],
  });
  const sideVegJagoda = createMockIngredient({
    id: "ing-side-veg-jagoda",
    name: "Side Veg Jagoda",
    calories: 50,
    proteins: 2,
    fats: 1,
    carbs: 10,
    unitConversions: [createMockIngredientUnit("ing-side-veg-jagoda", "unit-grams", 1, "grams")],
  });
  const sideSauceNelson = createMockIngredient({
    id: "ing-side-sauce-nelson",
    name: "Side Sauce Nelson",
    calories: 80,
    proteins: 1,
    fats: 7,
    carbs: 4,
    unitConversions: [createMockIngredientUnit("ing-side-sauce-nelson", "unit-grams", 1, "grams")],
  });

  const recipe = createMockRecipe({
    servings: 2,
    servingMultiplierForNelson: 2,
    images: [],
    ingredientGroups: [],
    notes: [],
    instructions: [],
    ingredients: [
      {
        id: "ri-shared-protein",
        recipeId: "recipe-1",
        groupId: null,
        position: 0,
        ingredientId: sharedProtein.id,
        unitId: "unit-grams",
        amount: 300,
        nutritionTarget: "BOTH",
        additionalInfo: null,
        group: null,
        ingredient: sharedProtein,
        unit: gramsUnit,
      },
      {
        id: "ri-side-veg-jagoda",
        recipeId: "recipe-1",
        groupId: null,
        position: 1,
        ingredientId: sideVegJagoda.id,
        unitId: "unit-grams",
        amount: 100,
        nutritionTarget: "PRIMARY_ONLY",
        additionalInfo: null,
        group: null,
        ingredient: sideVegJagoda,
        unit: gramsUnit,
      },
      {
        id: "ri-side-sauce-nelson",
        recipeId: "recipe-1",
        groupId: null,
        position: 2,
        ingredientId: sideSauceNelson.id,
        unitId: "unit-grams",
        amount: 100,
        nutritionTarget: "SECONDARY_ONLY",
        additionalInfo: null,
        group: null,
        ingredient: sideSauceNelson,
        unit: gramsUnit,
      },
    ],
  });

  return {
    recipe,
    ingredients: [sharedProtein, sideVegJagoda, sideSauceNelson],
  };
}

function buildScaledRecipe(
  recipe: RecipeType,
  options?: {
    globalScale?: number;
    localScaleById?: Record<string, number>;
    calorieScalingFactor?: number;
  },
): RecipeType {
  const globalScale = options?.globalScale ?? 1;
  const localScaleById = options?.localScaleById ?? {};
  const calorieScalingFactor = options?.calorieScalingFactor ?? 1;

  return {
    ...recipe,
    ingredients: recipe.ingredients.map((row) => {
      if (row.amount == null) {
        return row;
      }
      const rowScale = localScaleById[row.id] ?? 1;
      const calorieFactor = getPrimaryCalorieScalingFactorForTarget(
        row.nutritionTarget,
        calorieScalingFactor,
      );
      return {
        ...row,
        amount: row.amount * globalScale * rowScale * calorieFactor,
      };
    }),
  };
}

function expectNutritionToMatchScaledRecipe(recipe: RecipeType): void {
  const expectedJagoda = calculateNutritionPerServing(recipe, "primary");
  const expectedNelson = calculateNutritionPerServing(recipe, "secondary");

  const caloriesInput = screen.getByLabelText("Calories per portion");
  expect(caloriesInput).toHaveAttribute(
    "placeholder",
    expectedJagoda.calories.toString(),
  );
  expect(screen.getByText(`${expectedNelson.calories} calories`)).toBeInTheDocument();
}

async function setIngredientAmount(ingredientName: string, value: string): Promise<void> {
  const input = screen.getByLabelText(`Amount of ${ingredientName}`);
  await userEvent.clear(input);
  await userEvent.type(input, `${value}{enter}`);
}

describe("RecipePage nutrition integration", () => {
  it("updates only edited row nutrition by default and shows apply-all icon", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    render(<RecipePage recipe={recipe} ingredients={ingredients} />);

    await waitFor(() => expectNutritionToMatchScaledRecipe(recipe));

    await setIngredientAmount("Side Veg Jagoda", "200");

    // Only edited row is changed before explicit apply-all.
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(300);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(100);
    expect(
      screen.getByLabelText("Scale all ingredients based on Side Veg Jagoda"),
    ).toBeInTheDocument();

    const scaledRecipe = buildScaledRecipe(recipe, {
      localScaleById: { "ri-side-veg-jagoda": 2 },
    });
    expectNutritionToMatchScaledRecipe(scaledRecipe);
  });

  it("applies edited row ratio to all ingredients when scale icon is clicked", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    render(<RecipePage recipe={recipe} ingredients={ingredients} />);

    await setIngredientAmount("Side Veg Jagoda", "200");
    await userEvent.click(
      screen.getByLabelText("Scale all ingredients based on Side Veg Jagoda"),
    );

    // Global scale now applies to every numeric row.
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(600);
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(200);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(200);
    expect(
      screen.queryByLabelText("Scale all ingredients based on Side Veg Jagoda"),
    ).not.toBeInTheDocument();

    const scaledRecipe = buildScaledRecipe(recipe, { globalScale: 2 });
    expectNutritionToMatchScaledRecipe(scaledRecipe);
  });

  it("uses the second edited row as source for apply-all and clears previous local intent", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    render(<RecipePage recipe={recipe} ingredients={ingredients} />);

    // Row A local scale: 1.5x
    await setIngredientAmount("Shared Protein", "450");
    // Row B local scale: 0.8x
    await setIngredientAmount("Side Veg Jagoda", "80");
    await userEvent.click(
      screen.getByLabelText("Scale all ingredients based on Side Veg Jagoda"),
    );

    // Apply-all uses row B scale globally; row A prior local edit is discarded.
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(240);
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(80);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(80);

    const scaledRecipe = buildScaledRecipe(recipe, { globalScale: 0.8 });
    expectNutritionToMatchScaledRecipe(scaledRecipe);
  });

  it("keeps SECONDARY_ONLY rows unscaled by Jagoda calorie target", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    render(<RecipePage recipe={recipe} ingredients={ingredients} />);

    const caloriesInput = screen.getByLabelText("Calories per portion");
    await userEvent.type(caloriesInput, "300");

    // Base Jagoda calories are 150 in this fixture, so target 300 => 2x.
    const calorieScalingFactor = 2;
    const scaledRecipe = buildScaledRecipe(recipe, { calorieScalingFactor });
    expectNutritionToMatchScaledRecipe(scaledRecipe);

    // SECONDARY_ONLY amount should stay unchanged in UI while target is active.
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(100);
  });

  it("resets to baseline values after mixed scaling interactions", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    render(<RecipePage recipe={recipe} ingredients={ingredients} />);

    await setIngredientAmount("Shared Protein", "450");
    await userEvent.click(
      screen.getByLabelText("Scale all ingredients based on Shared Protein"),
    );
    const caloriesInput = screen.getByLabelText("Calories per portion");
    await userEvent.clear(caloriesInput);
    await userEvent.type(caloriesInput, "260");

    await userEvent.click(screen.getByLabelText("Reset ingredient amounts"));

    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(300);
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(100);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(100);
    expectNutritionToMatchScaledRecipe(recipe);
  });
});
