import { Input } from "@/components/ui/input";
import { useRecipePageNutritionSectionData } from "@/components/context/recipe-page-context";
import {
  NutritionPersonCard,
  NutritionPersonSummaryRow,
} from "@/components/recipes/nutrition-person-summary";
import { Subheader } from "@/components/recipes/recipe-page/subheader";

export function NutritionSection() {
  const {
    targetCaloriesPerPortion,
    jagodaNutrition,
    nelsonNutrition,
    onCaloriesChange,
  } = useRecipePageNutritionSectionData();

  return (
    <div className="flex flex-col gap-item">
      <Subheader>Nutrition (per serving)</Subheader>

      {/* Shared row shell with edit surface for Jagoda’s calorie target */}
      <NutritionPersonCard>
        <NutritionPersonSummaryRow
          personLabel="Jagoda"
          caloriesArea={
            <div className="flex items-center gap-tight">
              <Input
                type="number"
                size="default"
                value={
                  targetCaloriesPerPortion?.toString() ??
                  jagodaNutrition.calories.toString()
                }
                onChange={(event) => onCaloriesChange(event.target.value)}
                // Keep only width + number spinner reset; rely on DS defaults for spacing.
                className="w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Calories per portion"
              />
              <span className="type-body leading-4 text-foreground">kcal</span>
            </div>
          }
          protein={jagodaNutrition.protein}
          fat={jagodaNutrition.fat}
          carbs={jagodaNutrition.carbs}
        />
      </NutritionPersonCard>

      <NutritionPersonCard>
        <NutritionPersonSummaryRow
          personLabel="Nelson"
          caloriesArea={
            <span className="type-body text-foreground">
              {nelsonNutrition.calories} kcal
            </span>
          }
          protein={nelsonNutrition.protein}
          fat={nelsonNutrition.fat}
          carbs={nelsonNutrition.carbs}
        />
      </NutritionPersonCard>
    </div>
  );
}
