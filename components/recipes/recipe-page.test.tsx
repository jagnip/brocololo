import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipePage from "./recipe-page";
import { RecipePageProvider } from "@/components/context/recipe-page-context";
import { TopbarProvider, useTopbar } from "@/components/context/topbar-context";
import { Button } from "@/components/ui/button";
import {
  calculateNutritionPerServing,
  getCalorieScalingFactorForIngredient,
} from "@/lib/recipes/helpers";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipe,
  createMockRecipeIngredient,
  createMockUnit,
} from "@/lib/tests/test-helpers";
import type { RecipeType } from "@/types/recipe";
import type { IngredientType } from "@/types/ingredient";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { format } from "date-fns";
import { vi } from "vitest";

function formatDatePickerLabel(isoDateKey: string): string {
  const [year, month, day] = isoDateKey.split("-").map(Number);
  return format(new Date(year, (month ?? 1) - 1, day ?? 1), "PPP");
}

vi.mock("@/actions/log-actions", () => ({
  addRecipeToLogAction: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    }),
  };
});

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

const mockFamilyMembers: FamilyMemberRow[] = [
  { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0 },
  { id: "family-member-1", name: "Nelson", isSelf: false, sortOrder: 1 },
];

/** Renders topbar actions registered by RecipePage for jsdom tests. */
function TestTopbarActions() {
  const { config } = useTopbar();
  if (!config?.actions?.length) {
    return null;
  }
  return (
    <div data-testid="test-topbar-actions">
      {config.actions.map((action) =>
        action.href ? null : (
          <Button
            key={action.id}
            type="button"
            variant={action.variant ?? "outline"}
            size={action.size ?? "default"}
            disabled={action.disabled}
            aria-label={action.ariaLabel}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ),
      )}
    </div>
  );
}

function renderRecipePage(
  recipe: RecipeType,
  ingredients: IngredientType[],
  familyMembers: FamilyMemberRow[] = mockFamilyMembers,
) {
  const today = new Date().toLocaleDateString("en-CA");
  return render(
    <TopbarProvider>
      <RecipePageProvider
        recipe={recipe}
        ingredients={ingredients}
        familyMembers={familyMembers}
        availableLogDateKeys={[today]}
      >
        <TestTopbarActions />
        <RecipePage ingredientFormDependencies={ingredientFormDependencies} />
      </RecipePageProvider>
    </TopbarProvider>,
  );
}

function getIngredientRow(ingredientName: string): HTMLElement {
  const amountInput = screen.getByLabelText(`Amount of ${ingredientName}`);
  const row = amountInput.closest("li");
  if (!row) {
    throw new Error(`Ingredient row not found for ${ingredientName}`);
  }
  return row;
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

  const sharedRow = createMockRecipeIngredient({
    id: "ri-shared-protein",
    amount: 300,
    nutritionTarget: "BOTH",
    ingredient: sharedProtein,
    unit: gramsUnit,
  });
  const sideVegRow = createMockRecipeIngredient({
    id: "ri-side-veg-jagoda",
    position: 1,
    amount: 100,
    nutritionTarget: "PRIMARY_ONLY",
    ingredient: sideVegJagoda,
    unit: gramsUnit,
  });
  const sideSauceRow = createMockRecipeIngredient({
    id: "ri-side-sauce-nelson",
    position: 2,
    amount: 100,
    nutritionTarget: "SECONDARY_ONLY",
    ingredient: sideSauceNelson,
    unit: gramsUnit,
  });

  const recipe = createMockRecipe({
    servings: 2,
    memberPortions: [
      { recipeId: "recipe-1", familyMemberId: "family-member-1", multiplier: 2 },
    ],
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
            recipeIngredient: sharedRow,
          },
          {
            id: "step-link-jagoda",
            recipeInstructionId: "step-1",
            recipeIngredientId: "ri-side-veg-jagoda",
            recipeIngredient: sideVegRow,
          },
          {
            id: "step-link-nelson",
            recipeInstructionId: "step-1",
            recipeIngredientId: "ri-side-sauce-nelson",
            recipeIngredient: sideSauceRow,
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
    ingredients: [sharedRow, sideVegRow, sideSauceRow],
  });

  return {
    recipe,
    ingredients: [sharedProtein, sideVegJagoda, sideSauceNelson],
  };
}

function expectInstructionSectionToContain(...fragments: string[]): void {
  const instructionSectionText =
    getNormalizedInstructionsSectionText().toLowerCase();
  for (const fragment of fragments) {
    expect(instructionSectionText).toContain(fragment.toLowerCase());
  }
}

function expectInstructionBadgesVisibleForNoFilter(): void {
  // Default mode shows full amounts for all linked instruction ingredients.
  expectInstructionSectionToContain(
    "300 grams shared Protein",
    "100 grams side Veg Jagoda",
    "100 grams side Sauce Nelson",
  );
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
      const calorieFactor = getCalorieScalingFactorForIngredient(
        row.appliesToEveryone,
        row.memberTargets.map((target) => target.familyMemberId),
        "family-self",
        calorieScalingFactor,
      );
      return {
        ...row,
        amount: row.amount * globalScale * rowScale * calorieFactor,
      };
    }),
  };
}

function expectNutritionToMatchScaledRecipe(
  recipe: RecipeType,
  options?: { targetCaloriesPerPortion?: number },
): void {
  const expectedJagoda = calculateNutritionPerServing(
    recipe,
    "family-self",
    mockFamilyMembers,
  );
  const expectedNelson = calculateNutritionPerServing(
    recipe,
    "family-member-1",
    mockFamilyMembers,
  );

  const caloriesInput = screen.getByLabelText("Calories per portion");
  if (options?.targetCaloriesPerPortion != null) {
    expect(caloriesInput).toHaveValue(options.targetCaloriesPerPortion);
  } else {
    // Baseline calories show in placeholder until a target is entered.
    expect(caloriesInput).toHaveAttribute(
      "placeholder",
      expectedJagoda.calories.toString(),
    );
  }
  expect(screen.getByText(`${expectedNelson.calories} kcal`)).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add to log" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Add to log" }));

    const dialog = screen.getByRole("dialog");
    const today = new Date().toLocaleDateString("en-CA");

    expect(
      within(dialog).getByText(`Add ${recipe.name.toLowerCase()} to log`),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Person")).toBeInTheDocument();
    expect(within(dialog).getByText("Jagoda")).toBeInTheDocument();
    expect(
      within(dialog).getByText(formatDatePickerLabel(today)),
    ).toBeInTheDocument();
  });

  it("resets add to log defaults on reopen", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    const user = userEvent.setup();
    renderRecipePage(recipe, ingredients);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add to log" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Add to log" }));
    const firstDialog = screen.getByRole("dialog");
    const [personSelect] = within(firstDialog).getAllByRole("combobox");
    await user.click(personSelect);
    const personListbox = await screen.findByRole("listbox");
    await user.click(within(personListbox).getByText("Nelson"));
    await user.click(within(firstDialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Add to log" }));
    const secondDialog = screen.getByRole("dialog");
    expect(
      within(secondDialog).getByText(`Add ${recipe.name.toLowerCase()} to log`),
    ).toBeInTheDocument();
    expect(within(secondDialog).getByText("Jagoda")).toBeInTheDocument();
    expect(within(secondDialog).getByText(formatDatePickerLabel(
      new Date().toLocaleDateString("en-CA"),
    ))).toBeInTheDocument();
  });

  // Add-to-log rows use SearchableSelect without inline create; covered in log-day-view tests.
  it.skip('supports create-missing-ingredient path inside Add to log dialog', async () => {
    const { recipe, ingredients } = createRecipeFixture();
    const user = userEvent.setup();
    renderRecipePage(recipe, ingredients);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add to log" })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Add to log" }));
    const addToLogDialog = screen.getByRole("dialog");
    const [ingredientCombobox] = within(addToLogDialog).getAllByRole("combobox");
    await user.click(ingredientCombobox);
    await user.type(screen.getByPlaceholderText("Search ingredient..."), "cottage chee");

    const createOption = await screen.findByText('Create "cottage chee"');
    await user.click(createOption);

    expect(
      screen.getByText("Add a missing ingredient without leaving your current flow."),
    ).toBeInTheDocument();
    expect(
      within(addToLogDialog).getByText(`Add ${recipe.name.toLowerCase()} to log`),
    ).toBeInTheDocument();
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
    expectNutritionToMatchScaledRecipe(scaledRecipe, {
      targetCaloriesPerPortion: 300,
    });

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
    expectInstructionSectionToContain(
      "100 grams shared Protein",
      "100 grams side Veg Jagoda",
    );
    expect(instructionSectionText.toLowerCase()).not.toContain("side sauce nelson");
    expectInstructionStepTextToRemainVisible();
  });

  it("filters instruction ingredient badges for Nelson and splits BOTH amounts", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    await userEvent.click(screen.getByRole("radio", { name: "Nelson" }));
    const instructionSectionText = getNormalizedInstructionsSectionText();

    // Nelson sees SECONDARY_ONLY + Nelson share of BOTH (2/3 of 300 = 200).
    expectInstructionSectionToContain(
      "200 grams shared Protein",
      "100 grams side Sauce Nelson",
    );
    expect(instructionSectionText.toLowerCase()).not.toContain("side veg jagoda");
    expectInstructionStepTextToRemainVisible();
  });

  it("toggles selected person off when clicking the same segment again", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    const jagodaButton = screen.getByRole("radio", { name: "Jagoda" });
    await userEvent.click(jagodaButton);
    expect(getNormalizedInstructionsSectionText().toLowerCase()).not.toContain(
      "side sauce nelson",
    );

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
    expectInstructionSectionToContain(
      "400 grams shared Protein",
      "200 grams side Sauce Nelson",
    );
    expect(instructionSectionText.toLowerCase()).not.toContain("side veg jagoda");
    expectInstructionStepTextToRemainVisible();
  });
});

describe("RecipePage ingredient member badges", () => {
  it("shows member name badges for targeted ingredients", () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    const nelsonRow = getIngredientRow("Side Sauce Nelson");
    expect(within(nelsonRow).getByRole("group", { name: "For Nelson" })).toBeInTheDocument();
    expect(within(nelsonRow).queryByText("Selected")).not.toBeInTheDocument();

    const jagodaRow = getIngredientRow("Side Veg Jagoda");
    expect(within(jagodaRow).getByRole("group", { name: "For Jagoda" })).toBeInTheDocument();
  });

  it("does not show member badges for applies-to-everyone ingredients", () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    const sharedRow = getIngredientRow("Shared Protein");
    expect(within(sharedRow).queryByRole("group", { name: /^For / })).not.toBeInTheDocument();
  });

  it("hides member badges when household has only self", () => {
    const { recipe, ingredients } = createRecipeFixture();
    const soloFamily: FamilyMemberRow[] = [
      { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0 },
    ];
    renderRecipePage(recipe, ingredients, soloFamily);

    const nelsonRow = getIngredientRow("Side Sauce Nelson");
    expect(within(nelsonRow).queryByRole("group", { name: /^For / })).not.toBeInTheDocument();
    expect(within(nelsonRow).queryByText("Nelson")).not.toBeInTheDocument();
  });
});
