import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRecipePageNutritionSectionData } from "@/components/context/recipe-page-context";

export function NutritionSection() {
  const {
    currentServings,
    targetCaloriesPerPortion,
    jagodaNutrition,
    nelsonNutrition,
    onCaloriesChange,
  } = useRecipePageNutritionSectionData();

  return (
    <div className="space-y-2.5">
      <h3 className="text-base leading-5 font-semibold">
        Nutrition (per serving)
      </h3>

      <div className="space-y-1.5 rounded-lg border border-border bg-card px-2 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {currentServings >= 2 && (
            <span className="w-[52px] shrink-0 text-xs leading-4 font-normal text-muted-foreground">
              Jagoda
            </span>
          )}
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={targetCaloriesPerPortion?.toString() ?? ""}
              onChange={(event) => onCaloriesChange(event.target.value)}
              placeholder={jagodaNutrition.calories.toString()}
              className="h-[26px] w-16 [appearance:textfield] rounded-md border-input bg-background px-2 text-center text-xs leading-4 font-normal text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label="Calories per portion"
            />
            <span className="text-xs leading-4 font-medium text-foreground">
              kcal
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Badge variant="outline">{jagodaNutrition.protein}p</Badge>
            <Badge variant="outline">{jagodaNutrition.fat}f</Badge>
            <Badge variant="outline">{jagodaNutrition.carbs}c</Badge>
          </div>
        </div>
      </div>

      {currentServings >= 2 && (
        <div className="space-y-1.5 rounded-lg border border-border bg-card px-2 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-[52px] shrink-0 text-xs leading-4 font-normal text-muted-foreground">
              Nelson
            </span>
            <span className="text-xs font-medium text-foreground">
              {nelsonNutrition.calories} kcal
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Badge variant="outline">{nelsonNutrition.protein}p</Badge>
              <Badge variant="outline">{nelsonNutrition.fat}f</Badge>
              <Badge variant="outline">{nelsonNutrition.carbs}c</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
