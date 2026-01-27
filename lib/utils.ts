import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { RecipeType } from "@/types/recipe";
import type { InsertRecipeInputType } from "@/lib/validations/recipe";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

//To transform recipefrom to edit recipe form 
export function recipeToFormData(recipe: RecipeType): InsertRecipeInputType {
  return {
    name: recipe.name,
    categories: recipe.categories.map((cat) => cat.id),
    images: recipe.images?.map((img) => ({
      url: img.url,
      isCover: img.isCover,
    })) || [],
    handsOnTime: recipe.handsOnTime,
      totalTime: recipe.totalTime,
    servings: recipe.servings,
    servingMultiplierForNelson: recipe.servingMultiplierForNelson,
   ingredients: recipe.ingredients.map((ri) => ({
  ingredientId: ri.ingredient.id,
  amount: ri.amount,
  unitId: ri.unit.id,
  excludeFromNutrition: ri.excludeFromNutrition,
  additionalInfo: ri.additionalInfo,
})),
    instructions: recipe.instructions.join("\n"),
    notes: recipe.notes.join("\n")
  };
}

export type NutritionPerPortion = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

export function calculateNutritionPerServing(
  recipe: RecipeType,
): NutritionPerPortion {

  const total = recipe.ingredients.reduce(
    (acc, recipeIngredient) => {

         if (recipeIngredient.excludeFromNutrition) {
        return acc;
      }

          if (recipeIngredient.amount == null) {
        return acc;
      }
      
      const ingredient = recipeIngredient.ingredient;
      const unit = recipeIngredient.unit;
  
      const conversion = ingredient.unitConversions.find(
        (uc) => uc.unitId === unit.id
      );

      if (!conversion) {
        return acc;
      }

      const grams = recipeIngredient.amount * conversion.gramsPerUnit;

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

export function scaleNutritionByCalories(
  baseNutrition: NutritionPerPortion,
  targetCalories: number
): NutritionPerPortion {

  const scalingFactor = targetCalories / baseNutrition.calories;

  return {
    calories: Math.round(baseNutrition.calories * scalingFactor * 10) / 10,
    protein: Math.round(baseNutrition.protein * scalingFactor * 10) / 10,
    fat: Math.round(baseNutrition.fat * scalingFactor * 10) / 10,
    carbs: Math.round(baseNutrition.carbs * scalingFactor * 10) / 10,
  };
}


export type ScalingCalculation = {
  servingScalingFactor: number;
  jagodaPortionFactor: number; 
  nelsonPortionFactor: number;  
};


export function calculateServingScalingFactor(
  currentServings: number,
  recipeServings: number,
  nelsonMultiplier: number
): ScalingCalculation {

    if (currentServings === 1) {
    return {
      servingScalingFactor: 1 / recipeServings,
      jagodaPortionFactor: 1,
      nelsonPortionFactor: 0,
    };
  }
  
  // Split current servings in half, then apply multipliers
  const servingsPerPerson = currentServings / 2;
  const jagodaServings = servingsPerPerson * 1; // Always 1x
  const nelsonServings = servingsPerPerson * nelsonMultiplier;
  const totalServings = jagodaServings + nelsonServings;
  
  // Total parts = 1 (Jagoda) + multiplier (Nelson)
  const totalParts = 1 + nelsonMultiplier;
  const jagodaPortionFactor = 1 / totalParts;
  const nelsonPortionFactor = nelsonMultiplier / totalParts;
  
  // Scale ingredients based on total servings worth vs original recipe servings
  const servingScalingFactor = totalServings / recipeServings;

  return {
    servingScalingFactor,
    jagodaPortionFactor,
    nelsonPortionFactor,
  };
}