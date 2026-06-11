import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecipePageNutritionSectionData } from "@/components/context/recipe-page-context";
import { EditableCaloriesBadge } from "@/components/recipes/editable-calories-badge";
import {
  NutritionPersonCard,
  NutritionPersonSummaryRow,
} from "@/components/recipes/nutrition-person-summary";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { cn } from "@/lib/utils";

function caloriesAriaLabel(personLabel: string): string {
  return `Calories per portion for ${personLabel}`;
}

export function NutritionSection() {
  const {
    calorieTarget,
    nutritionRows,
    onCaloriesChange,
    hasActiveNutritionScaling,
    onNutritionReset,
  } = useRecipePageNutritionSectionData();
  const [focusedCaloriesMemberId, setFocusedCaloriesMemberId] = useState<
    string | null
  >(null);

  const handleNutritionReset = () => {
    onNutritionReset();
    // Unfocus so calculated kcal placeholders are visible again after reset.
    setFocusedCaloriesMemberId(null);
  };

  return (
    <div>
      <div className="mb-item flex min-h-8 items-center gap-item">
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

      <div className="flex flex-col gap-item">
        {nutritionRows.map((row) => {
        const isAnchor =
          calorieTarget?.familyMemberId === row.familyMemberId;
        const isFocused = focusedCaloriesMemberId === row.familyMemberId;

          return (
            <NutritionPersonCard key={row.familyMemberId}>
              <NutritionPersonSummaryRow
                personLabel={row.label}
                caloriesArea={
                  <EditableCaloriesBadge
                    ariaLabel={caloriesAriaLabel(row.label)}
                    value={
                      isAnchor && calorieTarget ? calorieTarget.calories : null
                    }
                    placeholder={
                      isFocused ? "" : (row.nutrition.calories.toString() ?? "0")
                    }
                    onChange={(value) =>
                      onCaloriesChange(row.familyMemberId, value)
                    }
                    onFocus={() =>
                      setFocusedCaloriesMemberId(row.familyMemberId)
                    }
                    onBlur={() => setFocusedCaloriesMemberId(null)}
                  />
                }
                protein={row.nutrition.protein}
                fat={row.nutrition.fat}
                carbs={row.nutrition.carbs}
              />
            </NutritionPersonCard>
          );
        })}
      </div>
    </div>
  );
}
