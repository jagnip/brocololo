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
    // Dark nutrition panel from mockup recipe detail page.
    <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-xl">
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/20 blur-2xl" />
      <div className="relative flex flex-col gap-item pb-item">
      <div className="flex min-h-8 items-center gap-item">
        <Subheader className="text-white">Nutrition (per serving)</Subheader>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleNutritionReset}
          aria-label="Reset nutrition to default"
          aria-hidden={!hasActiveNutritionScaling}
          tabIndex={hasActiveNutritionScaling ? 0 : -1}
          className={cn(
            "text-white hover:bg-white/10 hover:text-white",
            !hasActiveNutritionScaling && "pointer-events-none invisible",
          )}
        >
          <RotateCcw />
        </Button>
      </div>

      {nutritionRows.map((row) => {
        const isAnchor =
          calorieTarget?.familyMemberId === row.familyMemberId;
        const isFocused = focusedCaloriesMemberId === row.familyMemberId;

        return (
          <NutritionPersonCard key={row.familyMemberId} variant="dark">
            <NutritionPersonSummaryRow
              personLabel={row.label}
              tone="dark"
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
