import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type NutritionValues = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

type NutritionSectionProps = {
  currentServings: number;
  targetCaloriesPerPortion: number | null;
  jagodaNutrition: NutritionValues;
  nelsonNutrition: NutritionValues;
  onCaloriesChange: (value: string) => void;
};

export function NutritionSection({
  currentServings,
  targetCaloriesPerPortion,
  jagodaNutrition,
  nelsonNutrition,
  onCaloriesChange,
}: NutritionSectionProps) {
  return (
    <div>
      <h3 className="font-semibold mb-2">Nutrition (per meal)</h3>

      {/* Jagoda's nutrition — calorie input is editable */}
      <div className="flex gap-2 flex-wrap items-center mb-1">
        {currentServings >= 2 && (
          <span className="text-xs text-muted-foreground w-12">
            Jagoda
          </span>
        )}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="1"
            step="10"
            value={targetCaloriesPerPortion?.toString() ?? ""}
            onChange={(event) => onCaloriesChange(event.target.value)}
            placeholder={jagodaNutrition.calories.toString()}
            className="w-20 h-7 text-xs"
            aria-label="Calories per portion"
          />
          calories
        </div>
        <Badge variant="outline">{jagodaNutrition.protein}g protein</Badge>
        <Badge variant="outline">{jagodaNutrition.fat}g fat</Badge>
        <Badge variant="outline">{jagodaNutrition.carbs}g carbs</Badge>
      </div>

      {/* Nelson's nutrition — read-only, only for 2+ servings */}
      {currentServings >= 2 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground w-12">
            Nelson
          </span>
          <Badge variant="outline">{nelsonNutrition.calories} calories</Badge>
          <Badge variant="outline">{nelsonNutrition.protein}g protein</Badge>
          <Badge variant="outline">{nelsonNutrition.fat}g fat</Badge>
          <Badge variant="outline">{nelsonNutrition.carbs}g carbs</Badge>
        </div>
      )}
    </div>
  );
}
