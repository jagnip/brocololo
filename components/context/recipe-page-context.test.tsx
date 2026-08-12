import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  RecipePageProvider,
  useRecipePageCookingForData,
} from "@/components/context/recipe-page-context";
import { CookingForStripe } from "@/components/recipes/recipe-page/cooking-for-stripe";
import { encodePlanCookParam } from "@/lib/recipes/plan-cook-session-link";
import {
  createMockIngredient,
  createMockRecipe,
} from "@/lib/tests/test-helpers";
import type { FamilyMemberRow } from "@/lib/db/family-members";

const familyMembers: FamilyMemberRow[] = [
  {
    id: "family-self",
    name: "Jagoda",
    isSelf: true,
    sortOrder: 0,
    portionMultiplier: 1,
  },
  {
    id: "family-member-1",
    name: "Nelson",
    isSelf: false,
    sortOrder: 1,
    portionMultiplier: 2,
  },
];

function CookingHarness() {
  const cookingForData = useRecipePageCookingForData();
  return <CookingForStripe {...cookingForData} />;
}

/** Provider tree mirroring the recipe page, so tests can re-render it with new props. */
function cookingTree({
  initialCookParam,
  members = familyMembers,
  recipeId = "recipe-1",
}: {
  initialCookParam?: string | null;
  members?: FamilyMemberRow[];
  recipeId?: string;
}) {
  const recipe = createMockRecipe({
    id: recipeId,
    ingredients: [],
    ingredientGroups: [],
  });
  const ingredients = [createMockIngredient({ id: "ing-1" })];

  return (
    <RecipePageProvider
      recipe={recipe}
      ingredients={ingredients}
      familyMembers={members}
      availableLogDateKeys={[]}
      initialCookParam={initialCookParam}
    >
      <CookingHarness />
    </RecipePageProvider>
  );
}

function renderCooking(initialCookParam?: string | null) {
  return render(cookingTree({ initialCookParam }));
}

describe("RecipePageProvider plan cook hydration", () => {
  it("hydrates combinations from a valid initialCookParam and shows the banner", () => {
    const cook = encodePlanCookParam([
      { count: 2, memberIds: ["family-self", "family-member-1"] },
      { count: 1, memberIds: ["family-self"] },
    ]);

    renderCooking(cook);

    expect(
      screen.getByText("Meals setup for your meal plan (3 meals)."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Number of meals for combination 1"),
    ).toHaveTextContent("2");
    expect(
      screen.getByLabelText("Number of meals for combination 2"),
    ).toHaveTextContent("1");
  });

  it("falls back to the default session when the cook param is invalid", () => {
    renderCooking("not-a-valid-param");

    expect(
      screen.queryByText(/Meals setup for your meal plan/),
    ).toBeNull();
    expect(
      screen.getByLabelText("Number of meals for combination 1"),
    ).toHaveTextContent("1");
    expect(
      screen.queryByLabelText("Number of meals for combination 2"),
    ).toBeNull();
  });

  it("clears the banner when the user edits Cooking", async () => {
    const user = userEvent.setup();
    const cook = encodePlanCookParam(
      [{ count: 1, memberIds: ["family-self"] }],
      ["2026-06-14"],
    );

    renderCooking(cook);

    expect(
      screen.getByText("Meals setup for 14th Jun (1 meal)."),
    ).toBeInTheDocument();
    expect(screen.getByText("Meals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Increase meals for combination 1",
      }),
    );

    expect(screen.queryByText(/Meals setup for/)).toBeNull();
  });

  it("resets to the household default when Reset is clicked", async () => {
    const user = userEvent.setup();
    const cook = encodePlanCookParam([
      { count: 2, memberIds: ["family-self"] },
    ]);

    renderCooking(cook);

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.queryByText(/Meals setup for/)).toBeNull();
    expect(
      screen.getByLabelText("Number of meals for combination 1"),
    ).toHaveTextContent("1");
    // Default session selects everyone in the household.
    expect(
      screen.getByRole("button", {
        name: "Remove Jagoda for combination 1",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Remove Nelson for combination 1",
      }),
    ).toBeInTheDocument();
  });
});

// The recipe page runs inside React StrictMode in dev, which mounts effects twice.
// A reset effect used to fire on that second run and wipe the planner hand-off, so
// these cases render the real household from the reported bug under StrictMode.
describe("RecipePageProvider plan cook hydration in StrictMode", () => {
  const gloria = "family-member-gloria";
  const klaudia = "family-member-klaudia";
  const household: FamilyMemberRow[] = [
    ...familyMembers,
    {
      id: gloria,
      name: "Gloria",
      isSelf: false,
      sortOrder: 2,
      portionMultiplier: 1,
    },
    {
      id: klaudia,
      name: "Klaudia",
      isSelf: false,
      sortOrder: 3,
      portionMultiplier: 1,
    },
  ];

  function renderStrict(
    initialCookParam: string,
    members: FamilyMemberRow[] = household,
  ) {
    return render(
      <StrictMode>{cookingTree({ initialCookParam, members })}</StrictMode>,
    );
  }

  it("keeps a single-meal hand-off for a subset of the household", () => {
    // Apple oats: one breakfast planned for Gloria + Klaudia only.
    renderStrict(encodePlanCookParam([{ count: 1, memberIds: [gloria, klaudia] }]));

    expect(
      screen.getByText("Meals setup for your meal plan (1 meal)."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Gloria for combination 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Klaudia for combination 1" }),
    ).toBeInTheDocument();
    // Household members who are not eating stay unselected.
    expect(
      screen.getByRole("button", { name: "Add Jagoda for combination 1" }),
    ).toBeInTheDocument();
  });

  it("keeps every meal of a batch group, including differing audiences", () => {
    // Caprese sandwich: 4 batch meals for everyone + 1 for Jagoda and Nelson.
    renderStrict(
      encodePlanCookParam([
        { count: 4, memberIds: household.map((member) => member.id) },
        { count: 1, memberIds: ["family-self", "family-member-1"] },
      ]),
    );

    expect(
      screen.getByText("Meals setup for your meal plan (5 meals)."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Number of meals for combination 1"),
    ).toHaveTextContent("4");
    expect(
      screen.getByLabelText("Number of meals for combination 2"),
    ).toHaveTextContent("1");
    expect(
      screen.getByRole("button", { name: "Add Gloria for combination 2" }),
    ).toBeInTheDocument();
  });

  it("survives a re-render with an equal but newly created familyMembers array", () => {
    // Server components hand down a fresh array on every RSC render.
    const cook = encodePlanCookParam([{ count: 2, memberIds: [gloria] }]);
    const { rerender } = renderStrict(cook);

    rerender(
      <StrictMode>
        {cookingTree({ initialCookParam: cook, members: [...household] })}
      </StrictMode>,
    );

    expect(
      screen.getByText("Meals setup for your meal plan (2 meals)."),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Number of meals for combination 1"),
    ).toHaveTextContent("2");
  });

  it("falls back to the household default when the household really changes", () => {
    const cook = encodePlanCookParam([{ count: 2, memberIds: [gloria] }]);
    const { rerender } = renderStrict(cook);

    rerender(
      <StrictMode>
        {cookingTree({
          initialCookParam: cook,
          members: household.filter((member) => member.id !== gloria),
        })}
      </StrictMode>,
    );

    // Gloria is gone, so the encoded audience no longer resolves to her.
    expect(
      screen.getByRole("button", { name: "Remove Jagoda for combination 1" }),
    ).toBeInTheDocument();
  });
});
