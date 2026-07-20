import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecipePage from "./recipe-page";
import { RecipePageProvider } from "@/components/context/recipe-page-context";
import { TopbarProvider, useTopbar } from "@/components/context/topbar-context";
import { TopbarOverflowMenu } from "@/components/topbar-overflow-menu";
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
  { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: "family-member-1", name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 2 },
];

/** Renders topbar actions registered by RecipePage for jsdom tests. */
function TestTopbarActions() {
  const { config } = useTopbar();
  if (!config?.actions?.length && !config?.overflowMenu) {
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
      {config.overflowMenu ? (
        <TopbarOverflowMenu config={config.overflowMenu} />
      ) : null}
    </div>
  );
}

async function openRecipeActionsMenu(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Recipe actions" }),
    ).toBeInTheDocument();
  });
  await user.click(screen.getByRole("button", { name: "Recipe actions" }));
}

async function chooseRecipeAction(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await openRecipeActionsMenu(user);
  await user.click(screen.getByRole("menuitem", { name: label }));
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

async function setIngredientAmount(
  ingredientName: string,
  value: string,
): Promise<void> {
  const input = screen.getByLabelText(`Amount of ${ingredientName}`);
  await userEvent.clear(input);
  await userEvent.type(input, `${value}{enter}`);
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
  // Default cook session: aggregated totals for selected household members.
  expectInstructionSectionToContain(
    "shared protein 450 grams",
    "side veg jagoda 50 grams",
    "side sauce nelson 100 grams",
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
    calorieAnchorMemberId?: string;
  },
): RecipeType {
  const globalScale = options?.globalScale ?? 1;
  const localScaleById = options?.localScaleById ?? {};
  const calorieScalingFactor = options?.calorieScalingFactor ?? 1;
  const calorieAnchorMemberId = options?.calorieAnchorMemberId ?? "family-self";

  return {
    ...recipe,
    ingredients: recipe.ingredients.map((row) => {
      if (row.amount == null) {
        return row;
      }
      const rowScale = localScaleById[row.id] ?? 1;
      const calorieFactor = getCalorieScalingFactorForIngredient(
        row.memberAdjustments,
        mockFamilyMembers.map((member) => member.id),
        calorieAnchorMemberId,
        calorieScalingFactor,
      );
      return {
        ...row,
        amount: row.amount * globalScale * rowScale * calorieFactor,
      };
    }),
  };
}

function caloriesInputFor(personLabel: string): HTMLElement {
  return screen.getByLabelText(`Calories per portion for ${personLabel}`);
}

function expectNutritionToMatchScaledRecipe(
  recipe: RecipeType,
  options?: {
    anchorLabel?: string;
    anchorFamilyMemberId?: string;
    targetCalories?: number;
  },
): void {
  const anchorLabel = options?.anchorLabel ?? "Jagoda";
  const anchorFamilyMemberId = options?.anchorFamilyMemberId ?? "family-self";
  const otherFamilyMemberId =
    anchorFamilyMemberId === "family-self" ? "family-member-1" : "family-self";
  const otherLabel = anchorFamilyMemberId === "family-self" ? "Nelson" : "Jagoda";

  const expectedAnchor = calculateNutritionPerServing(
    recipe,
    anchorFamilyMemberId,
    mockFamilyMembers,
  );
  const expectedOther = calculateNutritionPerServing(
    recipe,
    otherFamilyMemberId,
    mockFamilyMembers,
  );

  const anchorInput = caloriesInputFor(anchorLabel);
  const otherInput = caloriesInputFor(otherLabel);
  expect(anchorInput.closest('[data-slot="badge"]')).toBeInTheDocument();
  expect(otherInput.closest('[data-slot="badge"]')).toBeInTheDocument();

  if (options?.targetCalories != null) {
    expect(anchorInput).toHaveValue(options.targetCalories);
    expect(otherInput).toHaveAttribute(
      "placeholder",
      expectedOther.calories.toString(),
    );
  } else {
    expect(anchorInput).toHaveAttribute(
      "placeholder",
      expectedAnchor.calories.toString(),
    );
    expect(otherInput).toHaveAttribute(
      "placeholder",
      expectedOther.calories.toString(),
    );
  }
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

  it("opens delete confirmation from recipe actions menu", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    const user = userEvent.setup();
    renderRecipePage(recipe, ingredients);

    await chooseRecipeAction(user, "Delete recipe");

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Delete recipe?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(recipe.name, { exact: false }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Yes, delete" }),
    ).toBeInTheDocument();
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

    expect(screen.getByRole("heading", { name: "Create ingredient" })).toBeInTheDocument();
    expect(
      within(addToLogDialog).getByText(`Add ${recipe.name.toLowerCase()} to log`),
    ).toBeInTheDocument();
  });

  it("updates only edited row nutrition by default and shows apply-all icon", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    await waitFor(() => expectNutritionToMatchScaledRecipe(recipe));

    await setIngredientAmount("Side Veg Jagoda", "100");

    // Only edited row is changed before explicit apply-all.
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(450);
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

    await setIngredientAmount("Side Veg Jagoda", "100");
    await userEvent.click(
      screen.getByLabelText("Scale all ingredients based on Side Veg Jagoda"),
    );

    // Global scale now applies to every numeric row (2× from 50 -> 100 baseline).
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(900);
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(100);
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

    await setIngredientAmount("Side Veg Jagoda", "40");
    await userEvent.click(
      screen.getByLabelText("Scale all ingredients based on Side Veg Jagoda"),
    );

    // Apply-all uses row B scale globally; prior local edits on other rows are discarded.
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(360);
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(40);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(80);

    const scaledRecipe = buildScaledRecipe(recipe, { globalScale: 0.8 });
    expectNutritionToMatchScaledRecipe(scaledRecipe);
  });

  it("keeps SECONDARY_ONLY rows unscaled by Jagoda calorie target", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    const jagodaBaseline = calculateNutritionPerServing(
      recipe,
      "family-self",
      mockFamilyMembers,
    );
    const targetCalories = 300;
    const calorieScalingFactor = targetCalories / jagodaBaseline.calories;

    const caloriesInput = caloriesInputFor("Jagoda");
    await userEvent.type(caloriesInput, targetCalories.toString());

    const scaledRecipe = buildScaledRecipe(recipe, { calorieScalingFactor });
    expectNutritionToMatchScaledRecipe(scaledRecipe, {
      targetCalories: 300,
    });

    // SECONDARY_ONLY amount should stay unchanged in UI while target is active.
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(100);
  });

  it("scales shared and Nelson-targeted rows when Nelson calorie target is set", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    const nelsonBaseline = calculateNutritionPerServing(
      recipe,
      "family-member-1",
      mockFamilyMembers,
    );
    const nelsonTarget = nelsonBaseline.calories * 2;

    const caloriesInput = caloriesInputFor("Nelson");
    await userEvent.type(caloriesInput, nelsonTarget.toString());

    const calorieScalingFactor = 2;
    const scaledRecipe = buildScaledRecipe(recipe, {
      calorieScalingFactor,
      calorieAnchorMemberId: "family-member-1",
    });
    expectNutritionToMatchScaledRecipe(scaledRecipe, {
      anchorLabel: "Nelson",
      anchorFamilyMemberId: "family-member-1",
      targetCalories: nelsonTarget,
    });

    // PRIMARY_ONLY row stays unchanged while Nelson is the anchor.
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(50);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(200);
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(900);
  });

  it("switches calorie anchor from Jagoda to Nelson when Nelson target is edited", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    const jagodaBaseline = calculateNutritionPerServing(
      recipe,
      "family-self",
      mockFamilyMembers,
    );
    const jagodaTarget = 300;
    const jagodaCalorieScale = jagodaTarget / jagodaBaseline.calories;

    await userEvent.type(caloriesInputFor("Jagoda"), jagodaTarget.toString());
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(100);
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(
      Number((450 * jagodaCalorieScale).toFixed(2)),
    );

    const nelsonBaseline = calculateNutritionPerServing(
      recipe,
      "family-member-1",
      mockFamilyMembers,
    );
    const nelsonTarget = nelsonBaseline.calories * 2;
    await userEvent.clear(caloriesInputFor("Nelson"));
    await userEvent.type(caloriesInputFor("Nelson"), nelsonTarget.toString());

    // Anchor moved to Nelson: Jagoda-only row fixed, Nelson-only + shared scaled 2x.
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(50);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(200);
    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(900);
    expect(caloriesInputFor("Jagoda")).not.toHaveValue(300);
    expect(caloriesInputFor("Nelson")).toHaveValue(nelsonTarget);
  });

  it("resets to baseline values after mixed scaling interactions", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    await setIngredientAmount("Shared Protein", "675");
    await userEvent.click(
      screen.getByLabelText("Scale all ingredients based on Shared Protein"),
    );

    await userEvent.click(screen.getByLabelText("Reset ingredient amounts"));

    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(450);
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(50);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(100);
    expectNutritionToMatchScaledRecipe(recipe);
  });

  it("shows instruction ingredient badges for all cooking members", () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    expectInstructionBadgesVisibleForNoFilter();
    expectInstructionStepTextToRemainVisible();
  });

  it("combines global scaling with per-person instruction badges", async () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    // 300 -> 600 globally for shared ingredient when applying 2x from Jagoda row.
    await setIngredientAmount("Side Veg Jagoda", "200");
    await userEvent.click(
      screen.getByLabelText("Scale all ingredients based on Side Veg Jagoda"),
    );

    // Aggregated instruction badges after global scale (no person names).
    expectInstructionSectionToContain(
      "shared protein 1800 grams",
      "side veg jagoda 200 grams",
      "side sauce nelson 400 grams",
    );
    expectInstructionStepTextToRemainVisible();
  });

  it("shows name-only instruction badges for amount-less linked ingredients", () => {
    const { recipe, ingredients } = createRecipeFixture();
    const saltIngredient = createMockIngredient({
      id: "ing-salt",
      name: "Salt",
      slug: "salt",
      unitConversions: [],
    });
    const saltRow = createMockRecipeIngredient({
      id: "ri-salt",
      position: 3,
      amount: null,
      unitId: null,
      unit: null,
      additionalInfo: "to taste",
      ingredient: saltIngredient,
    });
    const recipeWithSalt = {
      ...recipe,
      ingredients: [...recipe.ingredients, saltRow],
      instructions: recipe.instructions.map((instruction, index) =>
        index === 0
          ? {
              ...instruction,
              ingredients: [
                ...instruction.ingredients,
                {
                  id: "step-link-salt",
                  recipeInstructionId: instruction.id,
                  recipeIngredientId: saltRow.id,
                  recipeIngredient: saltRow,
                },
              ],
            }
          : instruction,
      ),
    };

    renderRecipePage(recipeWithSalt, [...ingredients, saltIngredient]);

    expectInstructionSectionToContain("salt · to taste");
    expectInstructionBadgesVisibleForNoFilter();
  });
});

describe("RecipePage aggregated ingredient rows", () => {
  it("shows one aggregated line per resolved ingredient", () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    expect(screen.getByLabelText("Amount of Shared Protein")).toHaveValue(450);
    expect(screen.getByLabelText("Amount of Side Veg Jagoda")).toHaveValue(50);
    expect(screen.getByLabelText("Amount of Side Sauce Nelson")).toHaveValue(100);
    expect(screen.queryByText("Nelson", { selector: '[data-slot="badge"]' })).not.toBeInTheDocument();
  });

  it("does not show People panel on aggregated view rows", () => {
    const { recipe, ingredients } = createRecipeFixture();
    renderRecipePage(recipe, ingredients);

    const sharedRow = getIngredientRow("Shared Protein");
    expect(
      within(sharedRow).queryByRole("button", {
        name: /Personal adjustments for Shared Protein/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("shows note behind Note toggle instead of inline text", async () => {
    const user = userEvent.setup();
    const { recipe, ingredients } = createRecipeFixture();
    const recipeWithInfo = {
      ...recipe,
      ingredients: recipe.ingredients.map((row) =>
        row.id === "ri-side-sauce-nelson"
          ? { ...row, additionalInfo: "warmed" }
          : row,
      ),
    };
    renderRecipePage(recipeWithInfo, ingredients);

    const nelsonRow = getIngredientRow("Side Sauce Nelson");
    expect(within(nelsonRow).queryByText("warmed")).not.toBeInTheDocument();

    await user.click(
      within(nelsonRow).getByRole("button", {
        name: /Note for Side Sauce Nelson/i,
      }),
    );
    expect(within(nelsonRow).getByText("warmed")).toBeInTheDocument();
  });
});
