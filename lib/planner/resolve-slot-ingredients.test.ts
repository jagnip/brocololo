import { describe, expect, it } from "vitest";
import { transformPlanToShoppingListRows, type PlanSlotData } from "@/lib/groceries/helpers";
import {
  createMockIngredient,
  createMockIngredientUnit,
  createMockRecipe,
  createMockRecipeIngredient,
  createMockUnit,
} from "@/lib/tests/test-helpers";
import {
  aggregateConsumableIngredientLines,
  formatSlotIngredientSummary,
  getPlannerRecipeDialogIngredientRows,
  getPlannerSlotIngredientDisplayLines,
  getSlotCookingFamilyMemberIds,
  resolveCustomMealAggregatedIngredients,
  resolveRecipeSlotAggregatedIngredients,
  type IngredientDisplayCatalogEntry,
  type IngredientUnitCatalogEntry,
  type RecipeSlotResolutionInput,
} from "@/lib/planner/resolve-slot-ingredients";
import type { RecipeType } from "@/types/recipe";

const familyMembers = [
  { id: "fm-jagoda", isSelf: true },
  { id: "fm-nelson", isSelf: false },
];

type RecipeIngredientOverrides = NonNullable<
  Parameters<typeof createMockRecipeIngredient>[0]
> & {
  memberAdjustments?: RecipeType["ingredients"][number]["memberAdjustments"];
};

function buildTypedRecipeIngredient(overrides: RecipeIngredientOverrides) {
  const { memberAdjustments, ...baseOverrides } = overrides;
  const row = createMockRecipeIngredient(baseOverrides);
  return memberAdjustments === undefined
    ? row
    : {
        ...row,
        appliesToEveryone: memberAdjustments.length === 0,
        memberAdjustments,
      };
}

function buildFullRecipeIngredientFixture(params: {
  id: string;
  ingredientId: string;
  ingredientName: string;
  amount: number;
  memberAdjustments?: RecipeType["ingredients"][number]["memberAdjustments"];
}) {
  const unit = createMockUnit({ id: "unit-g", name: "g" });
  const ingredient = createMockIngredient({
    id: params.ingredientId,
    name: params.ingredientName,
    unitConversions: [
      createMockIngredientUnit(params.ingredientId, unit.id, 1, unit.name),
    ],
  });
  return buildTypedRecipeIngredient({
    id: params.id,
    ingredientId: ingredient.id,
    amount: params.amount,
    ingredient,
    unit,
    memberAdjustments: params.memberAdjustments,
  });
}

function buildRecipe(overrides?: Partial<RecipeSlotResolutionInput>): RecipeSlotResolutionInput {
  return {
    servings: 2,
    audienceMembers: [
      { familyMemberId: "fm-jagoda" },
      { familyMemberId: "fm-nelson" },
    ],
    memberPortions: [],
    ingredients: [
      {
        id: "ri-butter",
        ingredientId: "ing-butter",
        amount: 40,
        additionalInfo: null,
        unit: { id: "unit-g", name: "g" },
        memberAdjustments: [
          {
            familyMemberId: "fm-jagoda",
            kind: "MODIFY",
            ingredientId: "ing-olive-oil",
            amount: 10,
            unitId: "unit-g",
          },
          { familyMemberId: "fm-nelson", kind: "SKIP" },
        ],
        ingredient: {
          id: "ing-butter",
          name: "Butter",
          brand: null,
          descriptor: null,
        },
      },
    ],
    ...overrides,
  };
}

const catalog = new Map<string, IngredientDisplayCatalogEntry>([
  [
    "ing-olive-oil",
    { id: "ing-olive-oil", name: "Olive oil", brand: null, descriptor: null },
  ],
  [
    "ing-butter",
    { id: "ing-butter", name: "Butter", brand: null, descriptor: null },
  ],
]);

const unitsById = new Map<string, IngredientUnitCatalogEntry>([
  ["unit-g", { name: "g" }],
]);

describe("resolveRecipeSlotAggregatedIngredients", () => {
  it("uses MODIFY substitute for adjusted eater and omits SKIP", () => {
    const lines = resolveRecipeSlotAggregatedIngredients({
      recipe: buildRecipe(),
      cookingFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
      familyMembers,
    });

    expect(lines).toEqual([
      { ingredientId: "ing-olive-oil", unitId: "unit-g", amount: 10 },
    ]);
  });

  it("returns empty when only skipped eater is selected", () => {
    const lines = resolveRecipeSlotAggregatedIngredients({
      recipe: buildRecipe(),
      cookingFamilyMemberIds: ["fm-nelson"],
      familyMembers,
    });

    expect(lines).toEqual([]);
  });

  it("recomputes when audience changes", () => {
    const both = resolveRecipeSlotAggregatedIngredients({
      recipe: buildRecipe(),
      cookingFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
      familyMembers,
    });
    const jagodaOnly = resolveRecipeSlotAggregatedIngredients({
      recipe: buildRecipe(),
      cookingFamilyMemberIds: ["fm-jagoda"],
      familyMembers,
    });

    expect(both).toEqual(jagodaOnly);
  });

  it("returns empty when cooking audience is empty", () => {
    const lines = resolveRecipeSlotAggregatedIngredients({
      recipe: buildRecipe(),
      cookingFamilyMemberIds: [],
      familyMembers,
    });

    expect(lines).toEqual([]);
  });
});

describe("aggregateConsumableIngredientLines", () => {
  it("sums amounts for the same ingredient and unit", () => {
    const lines = aggregateConsumableIngredientLines([
      { ingredientId: "ing-a", unitId: "unit-g", amount: 10 },
      { ingredientId: "ing-a", unitId: "unit-g", amount: 5 },
    ]);

    expect(lines).toEqual([
      { ingredientId: "ing-a", unitId: "unit-g", amount: 15 },
    ]);
  });
});

describe("getSlotCookingFamilyMemberIds", () => {
  it("returns explicit cooking audience when set", () => {
    expect(
      getSlotCookingFamilyMemberIds({
        cookingFamilyMemberIds: ["fm-jagoda"],
        familyMembers,
        recipeAudienceMemberIds: ["fm-jagoda", "fm-nelson"],
      }),
    ).toEqual(["fm-jagoda"]);
  });

  it("returns empty when no slot audience is set", () => {
    expect(
      getSlotCookingFamilyMemberIds({
        cookingFamilyMemberIds: [],
        familyMembers,
        recipeAudienceMemberIds: ["fm-jagoda", "fm-nelson"],
      }),
    ).toEqual([]);
  });
});

describe("resolveCustomMealAggregatedIngredients", () => {
  it("returns stored custom rows without per-person resolution", () => {
    const lines = resolveCustomMealAggregatedIngredients([
      { ingredientId: "ing-a", unitId: "unit-g", amount: 25 },
    ]);

    expect(lines).toEqual([
      { ingredientId: "ing-a", unitId: "unit-g", amount: 25 },
    ]);
  });
});

describe("formatSlotIngredientSummary", () => {
  it("formats visible lines and remaining count", () => {
    const lines = [
      { ingredientId: "ing-olive-oil", unitId: "unit-g", amount: 10 },
      { ingredientId: "ing-butter", unitId: "unit-g", amount: 20 },
      { ingredientId: "ing-a", unitId: "unit-g", amount: 1 },
      { ingredientId: "ing-b", unitId: "unit-g", amount: 2 },
      { ingredientId: "ing-c", unitId: "unit-g", amount: 3 },
    ];

    const summary = formatSlotIngredientSummary(lines, catalog, unitsById, 4);

    expect(summary.visibleLines).toHaveLength(4);
    expect(summary.visibleLines[0]).toContain("Olive oil");
    expect(summary.remainingCount).toBe(1);
  });
});

describe("getPlannerRecipeDialogIngredientRows", () => {
  it("returns editable rows from aggregated resolver output", () => {
    const recipe = createMockRecipe({
      servings: 2,
      audienceMembers: [
        { familyMemberId: "fm-jagoda" },
        { familyMemberId: "fm-nelson" },
      ],
      memberPortions: [],
      ingredients: [
        buildFullRecipeIngredientFixture({
          id: "ri-butter",
          ingredientId: "ing-butter",
          ingredientName: "Butter",
          amount: 40,
          memberAdjustments: [
            {
              familyMemberId: "fm-jagoda",
              kind: "MODIFY",
              ingredientId: "ing-olive-oil",
              amount: 10,
              unitId: "unit-g",
              additionalInfo: null,
            },
            {
              familyMemberId: "fm-nelson",
              kind: "SKIP",
              ingredientId: null,
              amount: null,
              unitId: null,
              additionalInfo: null,
            },
          ],
        }),
      ],
    });

    const rows = getPlannerRecipeDialogIngredientRows({
      recipe,
      cookingFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
      familyMembers,
    });

    expect(rows).toEqual([
      { ingredientId: "ing-olive-oil", unitId: "unit-g", amount: 10 },
    ]);
  });
});

describe("getPlannerSlotIngredientDisplayLines", () => {
  it("returns untruncated name/amount pairs that scale with audience", () => {
    const recipe = createMockRecipe({
      servings: 2,
      audienceMembers: [
        { familyMemberId: "fm-jagoda" },
        { familyMemberId: "fm-nelson" },
      ],
      memberPortions: [
        { recipeId: "recipe-1", familyMemberId: "fm-jagoda", multiplier: 1 },
        { recipeId: "recipe-1", familyMemberId: "fm-nelson", multiplier: 1 },
      ],
      ingredients: [
        buildFullRecipeIngredientFixture({
          id: "ri-flour",
          ingredientId: "ing-flour",
          ingredientName: "Flour",
          amount: 200,
        }),
      ],
    });

    const ingredientOptions = [
      {
        id: "ing-flour",
        name: "Flour",
        brand: null,
        descriptor: null,
        unitConversions: [
          { unitId: "unit-g", unitName: "g", unitNamePlural: null },
        ],
      },
    ];

    const both = getPlannerSlotIngredientDisplayLines({
      recipe,
      cookingFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
      familyMembers,
      ingredientOptions,
    });
    const one = getPlannerSlotIngredientDisplayLines({
      recipe,
      cookingFamilyMemberIds: ["fm-jagoda"],
      familyMembers,
      ingredientOptions,
    });

    expect(both).toEqual([
      { key: "ing-flour-unit-g", name: "Flour", amountLabel: "200 g" },
    ]);
    expect(one).toEqual([
      { key: "ing-flour-unit-g", name: "Flour", amountLabel: "100 g" },
    ]);
  });

  it("divides amounts by mealPortionCount for batch day share", () => {
    const recipe = createMockRecipe({
      servings: 2,
      audienceMembers: [
        { familyMemberId: "fm-jagoda" },
        { familyMemberId: "fm-nelson" },
      ],
      memberPortions: [
        { recipeId: "recipe-1", familyMemberId: "fm-jagoda", multiplier: 1 },
        { recipeId: "recipe-1", familyMemberId: "fm-nelson", multiplier: 1 },
      ],
      ingredients: [
        buildFullRecipeIngredientFixture({
          id: "ri-flour",
          ingredientId: "ing-flour",
          ingredientName: "Flour",
          amount: 200,
        }),
      ],
    });

    const ingredientOptions = [
      {
        id: "ing-flour",
        name: "Flour",
        brand: null,
        descriptor: null,
        unitConversions: [
          { unitId: "unit-g", unitName: "g", unitNamePlural: null },
        ],
      },
    ];

    expect(
      getPlannerSlotIngredientDisplayLines({
        recipe,
        cookingFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
        familyMembers,
        ingredientOptions,
        mealPortionCount: 2,
      }),
    ).toEqual([
      { key: "ing-flour-unit-g", name: "Flour", amountLabel: "100 g" },
    ]);
  });
});

function buildGrocerySlot(
  overrides?: Partial<PlanSlotData>,
): PlanSlotData {
  const oliveOilAdjustment = {
    familyMemberId: "fm-jagoda",
    kind: "MODIFY" as const,
    ingredientId: "ing-olive-oil",
    amount: 10,
    unitId: "unit-g",
    ingredient: {
      id: "ing-olive-oil",
      name: "Olive oil",
      brand: null,
      descriptor: null,
      icon: null,
      supermarketUrl: null,
      unitConversions: [{ unitId: "unit-g", gramsPerUnit: 1 }],
      category: { id: "cat-1", name: "Oil", sortOrder: 0 },
    },
    unit: { id: "unit-g", name: "g" },
  };

  return {
    recipeId: "recipe-1",
    cookingFamilyMemberIds: ["fm-jagoda", "fm-nelson"],
    familyMembers,
    recipe: {
      name: "Test Recipe",
      servings: 2,
      audienceMembers: [
        { familyMemberId: "fm-jagoda" },
        { familyMemberId: "fm-nelson" },
      ],
      memberPortions: [],
      ingredients: [
        {
          id: "ri-butter",
          ingredientId: "ing-butter",
          amount: 40,
          additionalInfo: null,
          memberAdjustments: [
            oliveOilAdjustment,
            { familyMemberId: "fm-nelson", kind: "SKIP" },
          ],
          ingredient: {
            id: "ing-butter",
            name: "Butter",
            brand: null,
            descriptor: null,
            icon: null,
            supermarketUrl: null,
            unitConversions: [{ unitId: "unit-g", gramsPerUnit: 1 }],
            category: { id: "cat-2", name: "Dairy", sortOrder: 1 },
          },
          unit: { id: "unit-g", name: "g" },
        },
      ],
    },
    customName: null,
    customIngredients: [],
    ...overrides,
  };
}

describe("planner and groceries parity", () => {
  it("matches groceries totals for the same slot audience", () => {
    const slot = buildGrocerySlot();
    const groceryRows = transformPlanToShoppingListRows([slot]);
    const plannerLines = resolveRecipeSlotAggregatedIngredients({
      recipe: {
        servings: slot.recipe!.servings,
        audienceMembers: slot.recipe!.audienceMembers,
        memberPortions: slot.recipe!.memberPortions,
        ingredients: slot.recipe!.ingredients.map((row) => ({
          id: row.id,
          ingredientId: row.ingredientId,
          amount: row.amount,
          additionalInfo: row.additionalInfo,
          unit: row.unit,
          memberAdjustments: row.memberAdjustments,
          ingredient: row.ingredient,
        })),
      },
      cookingFamilyMemberIds: slot.cookingFamilyMemberIds,
      familyMembers,
    });

    expect(plannerLines).toEqual([
      { ingredientId: "ing-olive-oil", unitId: "unit-g", amount: 10 },
    ]);
    expect(groceryRows.find((row) => row.ingredientId === "ing-olive-oil")?.amount).toBe(10);
    expect(groceryRows.find((row) => row.ingredientId === "ing-butter")).toBeUndefined();
  });
});
