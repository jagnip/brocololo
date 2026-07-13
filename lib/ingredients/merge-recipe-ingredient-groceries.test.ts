import { describe, expect, it } from "vitest";
import { mergeRecipeIngredientGroceries } from "./merge-recipe-ingredient-groceries";
import type { IngredientType } from "@/types/ingredient";
import type { RecipeType } from "@/types/recipe";

function makeResolvedIngredient(
  overrides: Partial<IngredientType> & Pick<IngredientType, "id">,
): IngredientType {
  return {
    id: overrides.id,
    userId: overrides.userId ?? null,
    name: overrides.name ?? "Tomato",
    slug: overrides.slug ?? "tomato",
    supermarketUrl: overrides.supermarketUrl ?? null,
    icon: null,
    brand: null,
    descriptor: null,
    calories: 18,
    proteins: 1,
    fats: 0,
    carbs: 4,
    categoryId: "cat-1",
    defaultUnitId: null,
    category: {
      id: "cat-1",
      name: "Veg",
      slug: "veg",
      sortOrder: 0,
    },
    unitConversions: [],
    ...overrides,
  } as IngredientType;
}

function makeRecipeRow(ingredientId: string, supermarketUrl: string | null) {
  return {
    id: `ri-${ingredientId}`,
    recipeId: "recipe-1",
    groupId: null,
    position: 0,
    ingredientId,
    unitId: null,
    amount: 100,
    appliesToEveryone: true,
    additionalInfo: null,
    group: null,
    memberAdjustments: [],
    unit: null,
    ingredient: {
      id: ingredientId,
      userId: null,
      name: "Tomato",
      slug: "tomato",
      supermarketUrl,
      icon: null,
      brand: null,
      descriptor: null,
      calories: 18,
      proteins: 1,
      fats: 0,
      carbs: 4,
      categoryId: "cat-1",
      defaultUnitId: null,
      category: {
        id: "cat-1",
        name: "Veg",
        slug: "veg",
        sortOrder: 0,
      },
      unitConversions: [],
    },
  } as RecipeType["ingredients"][number];
}

function makeRecipe(ingredients: RecipeType["ingredients"]): RecipeType {
  return {
    id: "recipe-1",
    name: "Salad",
    slug: "salad",
    servings: 2,
    ingredients,
  } as RecipeType;
}

describe("mergeRecipeIngredientGroceries", () => {
  it("merges overlay supermarket URL for global ingredients", () => {
    const recipe = makeRecipe([makeRecipeRow("ing-global", null)]);
    const resolved = [
      makeResolvedIngredient({
        id: "ing-global",
        userId: null,
        supermarketUrl: "https://shop.example.com/tomato",
      }),
    ];

    const merged = mergeRecipeIngredientGroceries(recipe, resolved);

    expect(merged.ingredients[0]?.ingredient.supermarketUrl).toBe(
      "https://shop.example.com/tomato",
    );
  });

  it("keeps null URL when viewer has no overlay", () => {
    const recipe = makeRecipe([makeRecipeRow("ing-global", null)]);
    const resolved = [
      makeResolvedIngredient({
        id: "ing-global",
        userId: null,
        supermarketUrl: null,
      }),
    ];

    const merged = mergeRecipeIngredientGroceries(recipe, resolved);

    expect(merged.ingredients[0]?.ingredient.supermarketUrl).toBeNull();
  });

  it("merges canonical supermarket URL for private ingredients", () => {
    const recipe = makeRecipe([makeRecipeRow("ing-private", null)]);
    const resolved = [
      makeResolvedIngredient({
        id: "ing-private",
        userId: "user-1",
        supermarketUrl: "https://shop.example.com/private-chicken",
      }),
    ];

    const merged = mergeRecipeIngredientGroceries(recipe, resolved);

    expect(merged.ingredients[0]?.ingredient.supermarketUrl).toBe(
      "https://shop.example.com/private-chicken",
    );
  });

  it("leaves row unchanged when ingredient is missing from resolved list", () => {
    const recipe = makeRecipe([
      makeRecipeRow("ing-missing", "https://legacy.example.com/tomato"),
    ]);

    const merged = mergeRecipeIngredientGroceries(recipe, []);

    expect(merged.ingredients[0]?.ingredient.supermarketUrl).toBe(
      "https://legacy.example.com/tomato",
    );
  });
});
