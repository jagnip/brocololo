import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecipeAction, updateRecipeAction } from "@/actions/recipe-actions";
import { TopbarProvider, useTopbar } from "@/components/context/topbar-context";
import { Button } from "@/components/ui/button";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { createMockRecipe } from "@/lib/tests/test-helpers";
import type { RecipeType } from "@/types/recipe";
import RecipeForm from "./recipe-form";

vi.mock("@/actions/recipe-actions", () => ({
  createRecipeAction: vi.fn(),
  updateRecipeAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

const familyMembers: FamilyMemberRow[] = [
  { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0, portionMultiplier: 1 },
  { id: "family-member-1", name: "Nelson", isSelf: false, sortOrder: 1, portionMultiplier: 1 },
  { id: "family-member-2", name: "Alex", isSelf: false, sortOrder: 2, portionMultiplier: 1 },
  { id: "family-member-3", name: "Sam", isSelf: false, sortOrder: 3, portionMultiplier: 1 },
];

function TestTopbarActions() {
  const { config } = useTopbar();
  return config?.actions.map((action) => (
    <Button
      key={action.id}
      type="button"
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  ));
}

function renderRecipeForm(recipe?: RecipeType) {
  return render(
    <TopbarProvider>
      <TestTopbarActions />
      <RecipeForm
        categories={[]}
        ingredients={[]}
        ingredientFormDependencies={{
          categories: [],
          units: [],
          gramsUnitId: "unit-grams",
          iconOptions: [],
        }}
        familyMembers={familyMembers}
        recipe={recipe}
      />
    </TopbarProvider>,
  );
}

function getPreferenceGroup(name: string) {
  return screen.getByRole("radiogroup", { name: `${name} recipe preference` });
}

function expectSelectedPreference(name: string, preference: string) {
  const group = getPreferenceGroup(name);
  expect(within(group).getByRole("radio", { name: preference })).toBeChecked();
  expect(within(group).getAllByRole("radio", { checked: true })).toHaveLength(1);
}

describe("RecipeForm preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createRecipeAction).mockResolvedValue({ type: "success", message: "Saved" });
    vi.mocked(updateRecipeAction).mockResolvedValue({ type: "success", message: "Saved" });
  });

  it("defaults every member to Neutral with accessible, titled icon options and no description", () => {
    renderRecipeForm();

    expect(screen.queryByText(/Preferences slightly influence/)).not.toBeInTheDocument();

    for (const member of familyMembers) {
      const group = getPreferenceGroup(member.name);
      for (const preference of ["Avoid", "Neutral", "Like", "Love"]) {
        expect(within(group).getByRole("radio", { name: preference })).toBeInTheDocument();
        expect(within(group).getByTitle(preference)).toBeInTheDocument();
      }
      expectSelectedPreference(member.name, "Neutral");
    }
    expect(createRecipeAction).not.toHaveBeenCalled();
    expect(updateRecipeAction).not.toHaveBeenCalled();
  });

  it("hydrates saved preferences by member ID and leaves missing members Neutral", () => {
    renderRecipeForm(createMockRecipe({
      ingredients: [],
      instructions: [],
      memberPreferences: [
        { familyMemberId: "family-member-2", preference: "AVOID" },
        { familyMemberId: "family-member-1", preference: "LOVE" },
        { familyMemberId: "family-self", preference: "LIKE" },
      ],
    }));

    expectSelectedPreference("Jagoda", "Like");
    expectSelectedPreference("Nelson", "Love");
    expectSelectedPreference("Alex", "Avoid");
    expectSelectedPreference("Sam", "Neutral");
  });

  it("selects preferences with arrow, Home, and End keys", async () => {
    const user = userEvent.setup();
    renderRecipeForm();
    await user.click(within(getPreferenceGroup("Jagoda")).getByRole("radio", { name: "Neutral" }));
    await user.keyboard("{ArrowRight}");
    expectSelectedPreference("Jagoda", "Like");
    expect(within(getPreferenceGroup("Jagoda")).getByRole("radio", { name: "Like" })).toHaveFocus();
    await user.keyboard("{End}");
    expectSelectedPreference("Jagoda", "Love");
    await user.keyboard("{ArrowRight}");
    expectSelectedPreference("Jagoda", "Avoid");
    await user.keyboard("{ArrowLeft}");
    expectSelectedPreference("Jagoda", "Love");
    await user.keyboard("{Home}");
    expectSelectedPreference("Jagoda", "Avoid");
  });

  it("disables preferences while saving", async () => {
    const user = userEvent.setup();
    let finishSave!: () => void;
    vi.mocked(updateRecipeAction).mockImplementation(() => new Promise((resolve) => {
      finishSave = () => resolve({ type: "success", message: "Saved" });
    }));
    renderRecipeForm(createMockRecipe({ ingredients: [], instructions: [] }));
    await user.click(screen.getByRole("button", { name: "Update recipe" }));
    await waitFor(() => expect(updateRecipeAction).toHaveBeenCalledTimes(1));
    for (const member of familyMembers) {
      for (const radio of within(getPreferenceGroup(member.name)).getAllByRole("radio")) {
        expect(radio).toBeDisabled();
      }
    }
    finishSave();
    await waitFor(() => expect(within(getPreferenceGroup("Jagoda")).getByRole("radio", { name: "Love" })).toBeEnabled());
  });

  it.each(["create", "edit"] as const)(
    "%s submits LIKE -> LOVE -> NEUTRAL sparsely without duplicates or losing other members",
    async (mode) => {
      const user = userEvent.setup();
      const recipe = createMockRecipe({
        name: "Preference regression recipe",
        handsOnTime: 10,
        totalTime: 20,
        servings: 4,
        ingredients: [],
        instructions: [],
        memberPreferences: [],
      });
      renderRecipeForm(mode === "edit" ? recipe : undefined);
      if (mode === "create") {
        await user.type(screen.getByRole("textbox", { name: "Name" }), recipe.name);
        await user.type(screen.getByRole("spinbutton", { name: "Hands-on time" }), "10");
        await user.type(screen.getByRole("spinbutton", { name: "Total time" }), "20");
      }

      await user.click(within(getPreferenceGroup("Nelson")).getByRole("radio", { name: "Avoid" }));
      const action = vi.mocked(mode === "edit" ? updateRecipeAction : createRecipeAction);
      for (const [index, preference] of ["Like", "Love", "Neutral"].entries()) {
        await user.click(within(getPreferenceGroup("Jagoda")).getByRole("radio", { name: preference }));
        expectSelectedPreference("Jagoda", preference);
        expectSelectedPreference("Nelson", "Avoid");
        await user.click(screen.getByRole("button", {
          name: mode === "edit" ? "Update recipe" : "Create recipe",
        }));
        await waitFor(() => expect(action).toHaveBeenCalledTimes(index + 1));
        const expectedPreferences = preference === "Neutral"
          ? [{ familyMemberId: "family-member-1", preference: "AVOID" }]
          : [
              { familyMemberId: "family-self", preference: preference.toUpperCase() },
              { familyMemberId: "family-member-1", preference: "AVOID" },
            ];
        const payload = expect.objectContaining({
          name: recipe.name,
          handsOnTime: 10,
          totalTime: 20,
          servings: 4,
          memberPreferences: expectedPreferences,
        });
        if (mode === "edit") {
          expect(updateRecipeAction).toHaveBeenNthCalledWith(index + 1, recipe.id, payload);
        } else {
          expect(createRecipeAction).toHaveBeenNthCalledWith(index + 1, payload);
        }
      }
      expect(mode === "edit" ? createRecipeAction : updateRecipeAction).not.toHaveBeenCalled();
    },
  );
});
