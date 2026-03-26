"use client";

import {
  formatIngredientAmount,
  type NutritionPerPortion,
} from "@/lib/recipes/helpers";

type IngredientNutritionalInfoProps = {
  isOpen: boolean;
  nutrition: NutritionPerPortion;
  oneUnitHeader: string | null;
  selectedAmountHeader: string | null;
  oneSelectedUnitNutrition: NutritionPerPortion | null;
  selectedAmountNutrition: NutritionPerPortion | null;
};

export function IngredientNutritionalInfo({
  isOpen,
  nutrition,
  oneUnitHeader,
  selectedAmountHeader,
  oneSelectedUnitNutrition,
  selectedAmountNutrition,
}: IngredientNutritionalInfoProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="mt-1 rounded-md border border-border/60 bg-card p-2">
      <div className="overflow-x-auto">
        {/* Keep layout table-like so the three macro perspectives are easy to compare. */}
        <table className="w-full table-fixed text-xs">
          <thead>
            <tr className="text-left align-top">
              <th className="w-20 font-medium text-muted-foreground pr-2">Macro</th>
              <th className="font-medium pr-3">100g</th>
              {oneUnitHeader && <th className="font-medium pr-3">{oneUnitHeader}</th>}
              {selectedAmountHeader && (
                <th className="font-medium">{selectedAmountHeader}</th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-muted-foreground pr-2">Calories</td>
              <td className="pr-3">{formatIngredientAmount(nutrition.calories, 2)} kcal</td>
              {oneSelectedUnitNutrition && (
                <td className="pr-3">
                  {formatIngredientAmount(oneSelectedUnitNutrition.calories, 2)} kcal
                </td>
              )}
              {selectedAmountNutrition && (
                <td>
                  {formatIngredientAmount(selectedAmountNutrition.calories, 2)} kcal
                </td>
              )}
            </tr>
            <tr>
              <td className="text-muted-foreground pr-2">Protein</td>
              <td className="pr-3">{formatIngredientAmount(nutrition.protein, 2)}g</td>
              {oneSelectedUnitNutrition && (
                <td className="pr-3">
                  {formatIngredientAmount(oneSelectedUnitNutrition.protein, 2)}g
                </td>
              )}
              {selectedAmountNutrition && (
                <td>{formatIngredientAmount(selectedAmountNutrition.protein, 2)}g</td>
              )}
            </tr>
            <tr>
              <td className="text-muted-foreground pr-2">Fat</td>
              <td className="pr-3">{formatIngredientAmount(nutrition.fat, 2)}g</td>
              {oneSelectedUnitNutrition && (
                <td className="pr-3">
                  {formatIngredientAmount(oneSelectedUnitNutrition.fat, 2)}g
                </td>
              )}
              {selectedAmountNutrition && (
                <td>{formatIngredientAmount(selectedAmountNutrition.fat, 2)}g</td>
              )}
            </tr>
            <tr>
              <td className="text-muted-foreground pr-2">Carbs</td>
              <td className="pr-3">{formatIngredientAmount(nutrition.carbs, 2)}g</td>
              {oneSelectedUnitNutrition && (
                <td className="pr-3">
                  {formatIngredientAmount(oneSelectedUnitNutrition.carbs, 2)}g
                </td>
              )}
              {selectedAmountNutrition && (
                <td>{formatIngredientAmount(selectedAmountNutrition.carbs, 2)}g</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
