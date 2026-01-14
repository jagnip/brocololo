// lib/utils/calculate-nutrition.ts

import type { RecipeType } from "@/types/recipe";

export type NutritionPerPortion = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export function calculateNutritionPerPortion(
  recipe: RecipeType
): NutritionPerPortion {

  const total = recipe.ingredients.reduce(
    (acc, recipeIngredient) => {
      const ingredient = recipeIngredient.ingredient;
      const grams = recipeIngredient.amount;
  
      
      const multiplier = grams / 100;
      
      return {
        calories: acc.calories + ingredient.calories * multiplier,
        protein: acc.protein + ingredient.proteins * multiplier,
        fat: acc.fat + ingredient.fats * multiplier,
        carbs: acc.carbs + ingredient.carbs * multiplier,
      };
    },
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const perPortion = {
    calories: total.calories / recipe.servings,
    protein: total.protein / recipe.servings,
    fat: total.fat / recipe.servings,
    carbs: total.carbs / recipe.servings,
  };

  return {
    calories: Math.round(perPortion.calories * 10) / 10,
    protein: Math.round(perPortion.protein * 10) / 10,
    fat: Math.round(perPortion.fat * 10) / 10,
    carbs: Math.round(perPortion.carbs * 10) / 10,
  };
}