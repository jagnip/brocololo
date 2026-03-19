import { render, screen, waitFor, within } from "@testing-library/react";
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
import { vi } from "vitest";

vi.mock("@/actions/log-actions", () => ({
  addRecipeToLogAction: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  // Cmdk-based selects rely on ResizeObserver in jsdom tests.
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (!HTMLElement.prototype.scrollIntoView) {
  // Cmdk attempts to scroll highlighted options into view.
  HTMLElement.prototype.scrollIntoView = () => {};
}

const ingredientFormDependencies = {
  categories: [{ id: "cat-dairy", name: "Dairy" }],
  units: [{ id: "unit-grams", name: "grams", namePlural: null }],
  gramsUnitId: "unit-grams",
  iconOptions: [],
};

function renderRecipePage(recipe: RecipeType, ingredients: IngredientType[]) {
  return render(
    <RecipePage
      recipe={recipe}
      ingredients={ingredients}
      ingredientFormDependencies={ingredientFormDependencies}
    />,
  );
}

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
    instructions: [
      {
        id: "step-1",
        recipeId: "recipe-1",
        position: 0,
        text: "Prepare both bowls",
        ingredients: [
          {
            id: "step-link-shared",
            recipeInstructionId: "step-1",
            recipeIngredientId: "ri-shared-protein",
            recipeIngredient: {
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
          },
          {
            id: "step-link-jagoda",
            recipeInstructionId: "step-1",
            recipeIngredientId: "ri-side-veg-jagoda",
            recipeIngredient: {
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
          },
          {
            id: "step-link-nelson",
            recipeInstructionId: "step-1",
            recipeIngredientId: "ri-side-sauce-nelson",
            recipeIngredient: {
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
          },
        ],
      },
      {
        id: "step-2",
        recipeId: "recipe-1",
        position: 1,
        text: "Finish and serve",
        ingredients: [],
      },
    ],
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

function expectInstructionBadgesVisibleForNoFilter(): void {
  const instructionSectionText = getNormalizedInstructionsSectionText();
  // Default mode shows full amounts for all linked instruction ingredients.
  expect(instructionSectionText).toContain("300 grams Shared Protein");
  expect(instructionSectionText).toContain("100 grams Side Veg Jagoda");
  expect(instructionSectionText).toContain("100 grams Side Sauce Nelson");
}

function expectInstructionStepTextToRemainVisible(): void {
  expect(screen.getByText("Prepare both bowls")).toBeInTheDocument();
  expect(screen.getByText("Finish and serve")).toBeInTheDocument();
}

function getNormalizedInstructionsSectionText(): string {
  const heading = screen.getByRole("heading", { name: "Instructions" });
  // Heading lives in an inner header row; step list is on its parent section node.
  const section = heading.closest("div")?.parentElement;
  if (!section) {
    throw new Error("Instructions section container not found");
  }
  return section.textContent?.replace(/\s+/g, " ").trim() ?? "";
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
  it("opens add to log dialog with Jagoda and today's date defaults", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    const user = userEvent.setup();
    renderRecipePage(recipe, ingredients);

    await user.click(screen.getByRole("button", { name: "Add to log" }));

    const dialog = screen.getByRole("dialog");
    const today = new Date().toLocaleDateString("en-CA");

    expect(within(dialog).getByText(`Add ${recipe.name} to log`)).toBeInTheDocument();
    expect(within(dialog).getByText("Person")).toBeInTheDocument();
    expect(within(dialog).getByText("Jagoda")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue(today)).toBeInTheDocument();
  });

  it("resets add to log defaults on reopen", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    const user = userEvent.setup();
    renderRecipePage(recipe, ingredients);

    await user.click(screen.getByRole("button", { name: "Add to log" }));
    const firstDialog = screen.getByRole("dialog");
    const dateInput = within(firstDialog).getByDisplayValue(
      new Date().toLocaleDateString("en-CA"),
    );
    await user.clear(dateInput);
    await user.type(dateInput, "2026-03-15");
    await user.click(within(firstDialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Add to log" }));
    const secondDialog = screen.getByRole("dialog");
    expect(within(secondDialog).getByText(`Add ${recipe.name} to log`)).toBeInTheDocument();
    expect(
      within(secondDialog).getByDisplayValue(new Date().toLocaleDateString("en-CA")),
    ).toBeInTheDocument();
    expect(within(secondDialog).getByText("Jagoda")).toBeInTheDocument();
  });

  it('supports create-missing-ingredient path inside Add to log dialog', async () => {
    const { recipe, ingredients } = createRecipeFixture();
    const user = userEvent.setup();
    renderRecipePage(recipe, ingredients);

    await user.click(screen.getByRole("button", { name: "Add to log" }));
    const addToLogDialog = screen.getByRole("dialog");
    await user.click(within(addToLogDialog).getByText("Shared Protein"));
    await user.type(screen.getByPlaceholderText("Search ingredient..."), "cottage chee");

    expect(screen.getByText('Create "cottage chee"')).toBeInTheDocument();
    await user.click(screen.getByText('Create "cottage chee"'));

    expect(
      screen.getByText("Add a missing ingredient without leaving your current flow."),
    ).toBeInTheDocument();
    expect(within(addToLogDialog).getByText(`Add ${recipe.name} to log`)).toBeInTheDocument();
  });

  it("updates only edited row nutrition by default and shows apply-all icon", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

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
    renderRecipePage(recipe, ingredients);

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
    renderRecipePage(recipe, ingredients);

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
    renderRecipePage(recipe, ingredients);

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
    renderRecipePage(recipe, ingredients);

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

  it("shows all instruction ingredient badges when no person is selected", () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    expectInstructionBadgesVisibleForNoFilter();
    expectInstructionStepTextToRemainVisible();
  });

  it("filters instruction ingredient badges for Jagoda and splits BOTH amounts", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    await userEvent.click(screen.getByRole("radio", { name: "Jagoda" }));
    const instructionSectionText = getNormalizedInstructionsSectionText();

    // Jagoda sees PRIMARY_ONLY + Jagoda share of BOTH (1/3 of 300 = 100).
    expect(instructionSectionText).toContain("100 grams Shared Protein");
    expect(instructionSectionText).toContain("100 grams Side Veg Jagoda");
    expect(instructionSectionText).not.toContain("Side Sauce Nelson");
    expectInstructionStepTextToRemainVisible();
  });

  it("filters instruction ingredient badges for Nelson and splits BOTH amounts", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    await userEvent.click(screen.getByRole("radio", { name: "Nelson" }));
    const instructionSectionText = getNormalizedInstructionsSectionText();

    // Nelson sees SECONDARY_ONLY + Nelson share of BOTH (2/3 of 300 = 200).
    expect(instructionSectionText).toContain("200 grams Shared Protein");
    expect(instructionSectionText).toContain("100 grams Side Sauce Nelson");
    expect(instructionSectionText).not.toContain("Side Veg Jagoda");
    expectInstructionStepTextToRemainVisible();
  });

  it("toggles selected person off when clicking the same segment again", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    const jagodaButton = screen.getByRole("radio", { name: "Jagoda" });
    await userEvent.click(jagodaButton);
    expect(getNormalizedInstructionsSectionText()).not.toContain("Side Sauce Nelson");

    // Clicking selected segment again clears filter and restores all badges.
    await userEvent.click(jagodaButton);
    expectInstructionBadgesVisibleForNoFilter();
    expectInstructionStepTextToRemainVisible();
  });

  it("combines person filter with global scaling for instruction badges", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    // 300 -> 600 globally for shared ingredient when applying 2x from Jagoda row.
    await setIngredientAmount("Side Veg Jagoda", "200");
    await userEvent.click(
      screen.getByLabelText("Scale all ingredients based on Side Veg Jagoda"),
    );
    await userEvent.click(screen.getByRole("radio", { name: "Nelson" }));
    const instructionSectionText = getNormalizedInstructionsSectionText();

    // Nelson share of scaled BOTH amount: 600 * 2/3 = 400.
    expect(instructionSectionText).toContain("400 grams Shared Protein");
    expect(instructionSectionText).toContain("200 grams Side Sauce Nelson");
    expect(instructionSectionText).not.toContain("Side Veg Jagoda");
    expectInstructionStepTextToRemainVisible();
  });
});
