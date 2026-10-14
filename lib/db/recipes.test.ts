import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecipe, updateRecipe } from "./recipes";
import type { CreateRecipePayload } from "../validations/recipe";

vi.mock("./index", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
    },
    familyMember: {
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
  type: "MEAL_OCCASION" | "RECIPE_TYPE" | "PROTEIN";
};

function baseCreateRecipeInput() {
  return {
    name: "Test recipe",
    slug: "test-recipe",
    mealOccasionCategoryIds: ["meal-breakfast-id"],
    proteinCategoryId: null as string | null,
    typeCategoryId: null as string | null,
    images: [],
    handsOnTime: 10,
    totalTime: 20,
    servings: 2,
    audienceFamilyMemberIds: ["family-self"],
    memberPortions: [],
    memberPreferences: [] as CreateRecipePayload["memberPreferences"],
    ingredientGroups: [],
    ingredients: [
      {
        tempIngredientKey: "tmp-1",
        ingredientId: "ingredient-1",
        amount: 1,
        unitId: "unit-1",
        memberAdjustments: [],
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
    plannedMealCount: 1,
    isBatchRecipe: false,
  };
}

const TEST_USER_ID = "user-test";

describe("createRecipe category type rules", () => {
  const recipeCreate = vi.fn();
  const recipeUpdate = vi.fn();
  const mockedPrisma = prisma as unknown as {
    category: { findMany: ReturnType<typeof vi.fn> };
    familyMember: { findMany: ReturnType<typeof vi.fn> };
    recipe: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    recipeCreate.mockResolvedValue({ id: "recipe-id" });
    recipeUpdate.mockResolvedValue({ id: "recipe-id" });

    mockedPrisma.familyMember.findMany.mockResolvedValue([
      { id: "family-self", name: "Jagoda", isSelf: true, sortOrder: 0 },
    ]);

    // Keep transaction stubs minimal: only methods touched by this test payload.
    mockedPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<string>) =>
      callback({
        recipe: {
          create: recipeCreate,
          update: recipeUpdate,
          findFirst: vi.fn().mockResolvedValue({ id: "recipe-id", isBatchRecipe: false }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "recipe-id" }),
        },
        recipeAudienceMember: {
          createMany: vi.fn(),
          deleteMany: vi.fn(),
        },
        recipeMemberPortion: {
          createMany: vi.fn(),
          deleteMany: vi.fn(),
        },
        recipeIngredientGroup: {
          create: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn(),
        },
        recipeIngredient: {
          create: vi.fn().mockResolvedValue({ id: "recipe-ingredient-id" }),
          findMany: vi.fn().mockResolvedValue([]),
          updateMany: vi.fn(),
        },
        recipeIngredientMemberAdjustment: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
        recipeInstruction: {
          create: vi.fn().mockResolvedValue({ id: "instruction-id" }),
          findMany: vi.fn().mockResolvedValue([]),
        },
        recipeInstructionIngredient: {
          createMany: vi.fn(),
          deleteMany: vi.fn(),
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

  it("allows recipes without protein category", async () => {
    mockedPrisma.category.findMany.mockResolvedValue([
      {
        id: "meal-breakfast-id",
        slug: "breakfast",
        type: "MEAL_OCCASION",
      } satisfies MockCategory,
    ]);

    await expect(createRecipe(TEST_USER_ID, baseCreateRecipeInput())).resolves.toMatchObject({
      id: "recipe-id",
    });
  });

  it("allows breakfast recipes with protein category", async () => {
    mockedPrisma.category.findMany.mockResolvedValue([
      {
        id: "meal-breakfast-id",
        slug: "breakfast",
        type: "MEAL_OCCASION",
      } satisfies MockCategory,
      {
        id: "protein-id",
        slug: "chicken",
        type: "PROTEIN",
      } satisfies MockCategory,
    ]);

    const input = {
      ...baseCreateRecipeInput(),
      proteinCategoryId: "protein-id",
    };

    await expect(createRecipe(TEST_USER_ID, input)).resolves.toMatchObject({
      id: "recipe-id",
    });
  });

  describe("member preferences", () => {
    beforeEach(() => {
      mockedPrisma.category.findMany.mockResolvedValue([
        { id: "meal-breakfast-id", slug: "breakfast", type: "MEAL_OCCASION" },
      ]);
    });

    it("creates sparse preferences inside the recipe transaction without reparsing notes", async () => {
      const memberPreferences = [{ familyMemberId: "family-self", preference: "LOVE" as const }];
      await createRecipe(TEST_USER_ID, {
        ...baseCreateRecipeInput(),
        notes: ["Already transformed"],
        memberPreferences,
      });

      expect(mockedPrisma.$transaction).toHaveBeenCalledOnce();
      expect(recipeCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          notes: ["Already transformed"],
          memberPreferences: { create: memberPreferences },
        }),
      }));
      expect(mockedPrisma.recipe.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({
        include: expect.objectContaining({
          memberPreferences: { select: { familyMemberId: true, preference: true } },
        }),
      }));
    });

    it.each([
      { memberPreferences: [] },
      { memberPreferences: [{ familyMemberId: "family-self", preference: "AVOID" as const }] },
    ])(
      "replaces all preferences on update: %j",
      async ({ memberPreferences }) => {
        await updateRecipe(TEST_USER_ID, "recipe-id", {
          ...baseCreateRecipeInput(),
          memberPreferences,
        });

        expect(recipeUpdate).toHaveBeenCalledWith(expect.objectContaining({
          where: { id: "recipe-id" },
          data: expect.objectContaining({
            memberPreferences: { deleteMany: {}, create: memberPreferences },
          }),
        }));
        expect(mockedPrisma.$transaction).toHaveBeenCalledOnce();
      },
    );

    it.each(["create", "update"] as const)("rejects foreign members before %s writes", async (operation) => {
      const input = {
        ...baseCreateRecipeInput(),
        memberPreferences: [{ familyMemberId: "foreign-member", preference: "LIKE" as const }],
      };
      const result = operation === "create"
        ? createRecipe(TEST_USER_ID, input)
        : updateRecipe(TEST_USER_ID, "recipe-id", input);

      await expect(result).rejects.toThrow("INVALID_FAMILY_MEMBER_SELECTION");
      expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    });

    it("defaults omitted preferences to an empty replacement at the DB boundary", async () => {
      const input = baseCreateRecipeInput();
      const { memberPreferences: omitted, ...withoutPreferences } = input;
      expect(omitted).toEqual([]);
      await updateRecipe(TEST_USER_ID, "recipe-id", withoutPreferences as typeof input);
      expect(recipeUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          memberPreferences: { deleteMany: {}, create: [] },
        }),
      }));
    });

    it.each(["create", "update"] as const)("propagates preference write failures from the %s transaction", async (operation) => {
      const failure = new Error("Preference write failed");
      (operation === "create" ? recipeCreate : recipeUpdate).mockRejectedValueOnce(failure);
      const input = {
        ...baseCreateRecipeInput(),
        memberPreferences: [{ familyMemberId: "family-self", preference: "LIKE" as const }],
      };
      const result = operation === "create"
        ? createRecipe(TEST_USER_ID, input)
        : updateRecipe(TEST_USER_ID, "recipe-id", input);

      await expect(result).rejects.toThrow(failure);
      expect(mockedPrisma.recipe.findUniqueOrThrow).not.toHaveBeenCalled();
    });

    it.each(["create", "update"] as const)("runtime-validates preferences before %s writes", async (operation) => {
      for (const memberPreferences of [
        [{ familyMemberId: "family-self", preference: "NEUTRAL" }],
        [
          { familyMemberId: "family-self", preference: "LIKE" },
          { familyMemberId: "family-self", preference: "LOVE" },
        ],
      ]) {
        const input = { ...baseCreateRecipeInput(), memberPreferences } as CreateRecipePayload & { slug: string };
        const result = operation === "create"
          ? createRecipe(TEST_USER_ID, input)
          : updateRecipe(TEST_USER_ID, "recipe-id", input);
        await expect(result).rejects.toThrow();
      }
      expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
