import type { RecipeType } from "@/types/recipe";
import type { InsertRecipeInputType } from "@/lib/validations/recipe";

export function recipeToFormData(recipe: RecipeType): InsertRecipeInputType {
  return {
    name: recipe.name,
    categories: recipe.categories.map((cat) => cat.id),
    imageUrl: recipe.imageUrl,
    handsOnTime: recipe.handsOnTime,
    servings: recipe.servings,
   ingredients: recipe.ingredients.map((ri) => ({
  ingredientId: ri.ingredient.id,
  amount: ri.amount,
  unitId: ri.unit.id,
})),
    instructions: recipe.instructions.join("\n"),
    notes: recipe.notes.join("\n"),
  };
}