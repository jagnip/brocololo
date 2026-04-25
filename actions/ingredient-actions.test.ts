import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/src/generated/client";
import { ROUTES } from "@/lib/constants";
import {
  createIngredient,
  deleteIngredient,
  findAvailableSlug,
  getGramsUnit,
  getIngredientDeleteUsages,
  updateIngredient,
} from "@/lib/db/ingredients";
import { redirect } from "next/navigation";
import {
  createIngredientAction,
  createIngredientInlineAction,
  deleteIngredientAction,
  updateIngredientAction,
  updateIngredientInlineAction,
} from "./ingredient-actions";
import type { IngredientFormValues } from "@/lib/validations/ingredient";
import { appendRedirectToastToPath } from "@/lib/messages";

vi.mock("next/navigation", () => ({
  // Keep redirect mocked so tests can assert target route.
  redirect: vi.fn(),
}));

vi.mock("@/lib/db/ingredients", () => ({
  getIngredientDeleteUsages: vi.fn(),
  deleteIngredient: vi.fn(),
  createIngredient: vi.fn(),
  findAvailableSlug: vi.fn(),
  getGramsUnit: vi.fn(),
  updateIngredient: vi.fn(),
}));

function makeKnownPrismaError(code: string) {
  // Build an object that passes `instanceof PrismaClientKnownRequestError`.
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError & { code: string };

  error.code = code;
  return error;
}

function makeValidIngredientFormValues(): IngredientFormValues {
  return {
    name: "Chicken Breast",
    brand: null,
    descriptor: null,
    icon: null,
    supermarketUrl: null,
    calories: 100,
    proteins: 20,
    fats: 1,
    carbs: 0,
    categoryId: "category-1",
    // Keep fixtures aligned with current ingredient schema requirements.
    defaultUnitId: "unit-g",
    unitConversions: [
      { unitId: "unit-g", gramsPerUnit: 1 },
      { unitId: "unit-cup", gramsPerUnit: 120 },
    ],
  };
}

function makeIngredientRecord() {
  return {
    id: "ingredient-1",
    name: "Chicken Breast",
    brand: null,
    descriptor: null,
    slug: "chicken-breast",
    icon: null,
    supermarketUrl: null,
    calories: 100,
    proteins: 20,
    fats: 1,
    carbs: 0,
    categoryId: "category-1",
    defaultUnitId: "unit-g",
    createdAt: new Date(),
    updatedAt: new Date(),
    unitConversions: [
      {
        ingredientId: "ingredient-1",
        unitId: "unit-g",
        gramsPerUnit: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        unit: {
          id: "unit-g",
          name: "g",
          namePlural: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
  };
}

describe("inline ingredient save actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGramsUnit).mockResolvedValue({ id: "unit-g", name: "g" });
    vi.mocked(findAvailableSlug).mockResolvedValue("chicken-breast");
  });

  it("creates ingredient inline and returns success payload", async () => {
    vi.mocked(createIngredient).mockResolvedValue(makeIngredientRecord());

    const result = await createIngredientInlineAction(makeValidIngredientFormValues());

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.ingredient.id).toBe("ingredient-1");
    }
    expect(redirect).not.toHaveBeenCalled();
  });

  it("normalizes descriptor before creating ingredient inline", async () => {
    vi.mocked(createIngredient).mockResolvedValue(makeIngredientRecord());

    await createIngredientInlineAction({
      ...makeValidIngredientFormValues(),
      descriptor: " (skinless) ",
    });

    expect(createIngredient).toHaveBeenCalledWith(
      expect.objectContaining({ descriptor: "skinless" }),
    );
  });

  it("updates ingredient inline and returns success payload", async () => {
    vi.mocked(updateIngredient).mockResolvedValue({
      ingredient: makeIngredientRecord(),
      fallbackStats: { updatedRows: 0, updatedRecipes: 0 },
    });

    const result = await updateIngredientInlineAction(
      "ingredient-1",
      makeValidIngredientFormValues(),
    );

    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.ingredient.id).toBe("ingredient-1");
    }
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns success with fallback stats when removed conversions are in use", async () => {
    vi.mocked(updateIngredient).mockResolvedValue({
      ingredient: makeIngredientRecord(),
      fallbackStats: { updatedRows: 2, updatedRecipes: 1 },
    });

    const result = await updateIngredientInlineAction(
      "ingredient-1",
      makeValidIngredientFormValues(),
    );

    expect(result).toEqual({
      type: "success",
      ingredient: expect.objectContaining({ id: "ingredient-1" }),
      conversionFallback: { updatedRows: 2, updatedRecipes: 1 },
    });
    expect(updateIngredient).toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("page ingredient save actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGramsUnit).mockResolvedValue({ id: "unit-g", name: "g" });
    vi.mocked(findAvailableSlug).mockResolvedValue("chicken-breast");
  });

  it("redirects after successful create in page flow", async () => {
    vi.mocked(createIngredient).mockResolvedValue(makeIngredientRecord());

    const result = await createIngredientAction(makeValidIngredientFormValues());

    // Redirect is terminal in production; mocked here for assertion.
    expect(result).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith(
      appendRedirectToastToPath(ROUTES.ingredients, "ingredientCreated"),
    );
  });

  it("redirects after successful update in page flow", async () => {
    vi.mocked(updateIngredient).mockResolvedValue({
      ingredient: makeIngredientRecord(),
      fallbackStats: { updatedRows: 0, updatedRecipes: 0 },
    });

    const result = await updateIngredientAction(
      "ingredient-1",
      makeValidIngredientFormValues(),
    );

    // Redirect is terminal in production; mocked here for assertion.
    expect(result).toBeUndefined();
    expect(redirect).toHaveBeenCalledWith(
      appendRedirectToastToPath(ROUTES.ingredients, "ingredientUpdated"),
    );
  });
});

describe("deleteIngredientAction", () => {
  const ingredientId = "ingredient-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks delete when ingredient is used by recipes", async () => {
    vi.mocked(getIngredientDeleteUsages).mockResolvedValue([
      { recipeName: "Pasta", recipeSlug: "pasta" },
      { recipeName: "Soup", recipeSlug: "soup" },
    ]);

    const result = await deleteIngredientAction(ingredientId);

    expect(result).toEqual({
      type: "error",
      message:
        "Cannot delete ingredient because it is used by recipes: Pasta, Soup.",
    });
    expect(deleteIngredient).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("limits recipe list in error message and shows overflow count", async () => {
    vi.mocked(getIngredientDeleteUsages).mockResolvedValue([
      { recipeName: "A", recipeSlug: "a" },
      { recipeName: "B", recipeSlug: "b" },
      { recipeName: "C", recipeSlug: "c" },
      { recipeName: "D", recipeSlug: "d" },
      { recipeName: "E", recipeSlug: "e" },
      { recipeName: "F", recipeSlug: "f" },
    ]);

    const result = await deleteIngredientAction(ingredientId);

    expect(result).toEqual({
      type: "error",
      message:
        "Cannot delete ingredient because it is used by recipes: A, B, C, D, E and 1 more.",
    });
    expect(deleteIngredient).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("deletes ingredient and redirects when no usages exist", async () => {
    vi.mocked(getIngredientDeleteUsages).mockResolvedValue([]);
    vi.mocked(deleteIngredient).mockResolvedValue({ id: ingredientId });

    const result = await deleteIngredientAction(ingredientId);

    // redirect is terminal; mocked version returns undefined in tests.
    expect(result).toBeUndefined();
    expect(deleteIngredient).toHaveBeenCalledWith(ingredientId);
    expect(redirect).toHaveBeenCalledWith(ROUTES.ingredients);
  });

  it("returns foreign-key error message for Prisma P2003", async () => {
    vi.mocked(getIngredientDeleteUsages).mockResolvedValue([]);
    vi.mocked(deleteIngredient).mockRejectedValue(makeKnownPrismaError("P2003"));

    const result = await deleteIngredientAction(ingredientId);

    expect(result).toEqual({
      type: "error",
      message:
        "Cannot delete ingredient because it is referenced by other records.",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns not-found message for Prisma P2025", async () => {
    vi.mocked(getIngredientDeleteUsages).mockResolvedValue([]);
    vi.mocked(deleteIngredient).mockRejectedValue(makeKnownPrismaError("P2025"));

    const result = await deleteIngredientAction(ingredientId);

    expect(result).toEqual({
      type: "error",
      message: "Ingredient was not found (it may already be deleted).",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns generic error for unexpected failures", async () => {
    vi.mocked(getIngredientDeleteUsages).mockResolvedValue([]);
    vi.mocked(deleteIngredient).mockRejectedValue(new Error("boom"));

    const result = await deleteIngredientAction(ingredientId);

    expect(result).toEqual({
      type: "error",
      message: "Failed to delete ingredient",
    });
    expect(redirect).not.toHaveBeenCalled();
  });
});
