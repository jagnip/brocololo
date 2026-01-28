import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecipe } from "./recipes";

vi.mock("./index", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
    },
    recipe: {
      findUniqueOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "./index";

type MockCategory = {
  id: string;
  slug: string;
  type: "FLAVOUR" | "RECIPE_TYPE" | "PROTEIN";
  parentId: string | null;
};

function baseCreateRecipeInput() {
  return {
    name: "Test recipe",
    slug: "test-recipe",
    flavourCategoryId: "flavour-id",
    proteinCategoryId: null as string | null,
    typeCategoryId: null as string | null,
    images: [],
    handsOnTime: 10,
    totalTime: 20,
    servings: 2,
    servingMultiplierForNelson: 1,
    ingredientGroups: [],
    ingredients: [
      {
        tempIngredientKey: "tmp-1",
        ingredientId: "ingredient-1",
        amount: 1,
        unitId: "unit-1",
        nutritionTarget: "BOTH",
        additionalInfo: null,
        groupTempKey: null,
        position: 0,
      },
    ],
    instructions: [
      {
        text: "Step one",
        linkedTempIngredientKeys: [],
      },
    ],
    notes: [] as string[],
    excludeFromPlanner: false,
  };
}

describe("createRecipe protein category rules", () => {
  const mockedPrisma = prisma as unknown as {
    category: { findMany: ReturnType<typeof vi.fn> };
    recipe: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Keep transaction stubs minimal: only methods touched by this test payload.
    mockedPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<string>) =>
      callback({
        recipe: {
          create: vi.fn().mockResolvedValue({ id: "recipe-id" }),
        },
        recipeIngredientGroup: {
          create: vi.fn(),
        },
        recipeIngredient: {
          create: vi.fn().mockResolvedValue({ id: "recipe-ingredient-id" }),
        },
        recipeInstruction: {
          create: vi.fn().mockResolvedValue({ id: "instruction-id" }),
        },
        recipeInstructionIngredient: {
          createMany: vi.fn(),
        },
      }),
    );

    mockedPrisma.recipe.findUniqueOrThrow.mockResolvedValue({
      id: "recipe-id",
      name: "Test recipe",
      slug: "test-recipe",
      categories: [],
      ingredientGroups: [],
      ingredients: [],
      instructions: [],
      images: [],
    });
  });

  it("allows savoury recipes without protein category", async () => {
    mockedPrisma.category.findMany.mockResolvedValue([
      {
        id: "flavour-id",
        slug: "savoury",
        type: "FLAVOUR",
        parentId: null,
      } satisfies MockCategory,
    ]);

    await expect(createRecipe(baseCreateRecipeInput())).resolves.toMatchObject({
      id: "recipe-id",
    });
  });

  it("rejects sweet recipes with protein category", async () => {
    mockedPrisma.category.findMany.mockResolvedValue([
      {
        id: "flavour-id",
        slug: "sweet",
        type: "FLAVOUR",
        parentId: null,
      } satisfies MockCategory,
      {
        id: "protein-id",
        slug: "chicken",
        type: "PROTEIN",
        parentId: "flavour-savoury-id",
      } satisfies MockCategory,
    ]);

    const input = {
      ...baseCreateRecipeInput(),
      proteinCategoryId: "protein-id",
    };

    await expect(createRecipe(input)).rejects.toThrow(
      "Protein is not allowed for sweet recipes",
    );
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});
