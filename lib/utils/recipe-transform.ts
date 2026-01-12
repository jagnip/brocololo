import type { RecipeType } from "@/types/recipe";
import type { InsertRecipeInputType } from "@/lib/validations/recipe";

export function recipeToFormData(recipe: RecipeType): InsertRecipeInputType {
  return {
    name: recipe.name,
    categories: recipe.categories.map((cat) => cat.id),
    photo: recipe.photo,
    handsOnTime: recipe.handsOnTime,
    portions: recipe.portions,
    nutrition: recipe.nutrition.join("\n"),
    ingredients: recipe.ingredients.join("\n"),
    instructions: recipe.instructions.join("\n"),
    notes: recipe.notes.join("\n"),
  };
}