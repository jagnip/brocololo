import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRecipePageNutritionSectionData } from "@/components/context/recipe-page-context";
import { EditableCaloriesBadge } from "@/components/recipes/editable-calories-badge";
import {
  NutritionPersonCard,
  NutritionPersonSummaryRow,
} from "@/components/recipes/nutrition-person-summary";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { cn } from "@/lib/utils";

export function NutritionSection() {
  const {
    targetCaloriesPerPortion,
    nutritionRows,
    onCaloriesChange,
    hasActiveNutritionScaling,
    onNutritionReset,
  } = useRecipePageNutritionSectionData();
  const selfRow = nutritionRows[0];
  const [isCaloriesInputFocused, setIsCaloriesInputFocused] = useState(false);

  const handleNutritionReset = () => {
    onNutritionReset();
    // Unfocus so the calculated kcal placeholder is visible again after reset.
    setIsCaloriesInputFocused(false);
  };

  return (
    // Extra bottom padding + reserved reset slot keep ingredients from jumping when scaling is active.
    <div className="flex flex-col gap-item pb-item">
      <div className="flex min-h-8 items-center gap-item">
        <Subheader>Nutrition (per serving)</Subheader>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNutritionReset}
          aria-label="Reset nutrition to default"
          aria-hidden={!hasActiveNutritionScaling}
          tabIndex={hasActiveNutritionScaling ? 0 : -1}
          className={cn(
            !hasActiveNutritionScaling && "pointer-events-none invisible",
          )}
        >
          <RotateCcw />
        </Button>
      </div>

      {nutritionRows.map((row, index) => (
        <NutritionPersonCard key={row.familyMemberId}>
          <NutritionPersonSummaryRow
            personLabel={row.label}
            caloriesArea={
              index === 0 ? (
                <EditableCaloriesBadge
                  value={targetCaloriesPerPortion}
                  placeholder={
                    isCaloriesInputFocused
                      ? ""
                      : (selfRow?.nutrition.calories.toString() ?? "0")
                  }
                  onChange={onCaloriesChange}
                  onFocus={() => setIsCaloriesInputFocused(true)}
                  onBlur={() => setIsCaloriesInputFocused(false)}
                />
              ) : (
                <Badge variant="secondary">{row.nutrition.calories} kcal</Badge>
              )
            }
            protein={row.nutrition.protein}
            fat={row.nutrition.fat}
            carbs={row.nutrition.carbs}
          />
        </NutritionPersonCard>
      ))}
    </div>
  );
}
