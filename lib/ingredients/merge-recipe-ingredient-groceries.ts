import type { IngredientType } from "@/types/ingredient";
import type { RecipeType } from "@/types/recipe";

/**
 * Apply per-user grocery URLs from the resolved ingredient catalog onto recipe rows.
 * Recipe nested ingredients from Prisma omit overlay merge; the recipe page already
 * loads merged ingredients via getIngredients.
 */
export function mergeRecipeIngredientGroceries(
  recipe: RecipeType,
  resolvedIngredients: IngredientType[],
): RecipeType {
  const supermarketUrlByIngredientId = new Map(
    resolvedIngredients.map((ingredient) => [
      ingredient.id,
      ingredient.supermarketUrl,
    ]),
  );

  return {
    ...recipe,
    ingredients: recipe.ingredients.map((row) => {
      const supermarketUrl = supermarketUrlByIngredientId.get(row.ingredient.id);
      if (supermarketUrl === undefined) {
        return row;
      }

      return {
        ...row,
        ingredient: {
          ...row.ingredient,
          supermarketUrl,
        },
      };
    }),
  };
}
