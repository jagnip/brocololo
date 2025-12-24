import type { RecipeType } from "@/types/recipe";
import type { CategoryType } from "@/types/category";
import { recipesData } from "./recipes-data";

const RECIPES_URL = "https://693ddb9df55f1be79303da63.mockapi.io";

export async function getRecipes() {
  const url = `${RECIPES_URL}/recipes`;
  try {
    const response = await fetch(url, {
      cache: 'force-cache',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch recipes. Response status: ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Failed to fetch recipes", (error as Error).message);
    return [];
  }
}

export async function getCategories(): Promise<CategoryType[]> {
  const url = `${RECIPES_URL}/categories`;
  try {
    const response = await fetch(url, {
      cache: 'force-cache',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch categories. Response status: ${response.status}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Failed to fetch categories", (error as Error).message);
    return [];
  }
}

export async function getRecipeById(recipeId: string, categorySlug?: string): Promise<RecipeType | null> {
  const recipes = recipesData;
  
  const filteredRecipes = categorySlug
    ? recipes.filter((r: RecipeType) => r.categorySlugs.includes(categorySlug))
    : recipes;

  return filteredRecipes.find((r: RecipeType) => r.id.toString() === recipeId) || null;
}
