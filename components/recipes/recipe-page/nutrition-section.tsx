import { Badge } from "@/components/ui/badge";
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
    nutritionRows,
    onCaloriesChange,
  } = useRecipePageNutritionSectionData();
  const selfRow = nutritionRows[0];

  return (
    <div className="flex flex-col gap-item">
      <Subheader>Nutrition (per serving)</Subheader>

      {nutritionRows.map((row, index) => (
        <NutritionPersonCard key={row.familyMemberId}>
          <NutritionPersonSummaryRow
            personLabel={row.label}
            caloriesArea={
              index === 0 ? (
                <div className="flex items-center gap-tight">
                  <Input
                    type="number"
                    size="default"
                    value={
                      targetCaloriesPerPortion?.toString() ??
                      (selfRow?.nutrition.calories.toString() ?? "0")
                    }
                    onChange={(event) => onCaloriesChange(event.target.value)}
                    // Keep only width + number spinner reset; rely on DS defaults for spacing.
                    className="w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label="Calories per portion"
                  />
                  <span className="type-body leading-4 text-foreground">kcal</span>
                </div>
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
