import type { RecipeType } from "@/types/recipe";
import type { CategoryType } from "@/types/category";

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

export async function getRecipeById(recipeId: string, categoryId?: string): Promise<RecipeType | null> {
  const recipes = await getRecipes();
  
  const filteredRecipes = categoryId
    ? recipes.filter((r: RecipeType) => r.category === categoryId)
    : recipes;

  return filteredRecipes.find((r: RecipeType) => r.id.toString() === recipeId) || null;
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
