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
    <div className="space-y-2">
      <h3 className="text text-base leading-5 font-semibold">
        Nutrition (per serving)
      </h3>

      <div className="space-y-2 rounded-lg border border-border bg-card px-2 py-2">
        <div className="flex flex-wrap items-center gap-2">
        
            <span className="w-[52px] shrink-0 text-sm leading-4 font-normal text-muted-foreground">
              Jagoda
            </span>
      
          <div className="flex items-center gap-1">
            <Input
              type="number"
              size="sm"
              value={
                targetCaloriesPerPortion?.toString() ??
                jagodaNutrition.calories.toString()
              }
              onChange={(event) => onCaloriesChange(event.target.value)}
              // Keep only width + number spinner reset; rely on DS defaults for spacing.
              className="w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label="Calories per portion"
            />
            <span className="text-sm leading-4 font-normal text-foreground">
              kcal
            </span>
          </div>
          <div className="flex flex-nowrap items-center gap-1 justify-end ml-auto pl-6 md:w-full md:ml-0 md:pl-0 md:justify-start md:flex-wrap lg:w-auto lg:ml-auto lg:pl-6 lg:justify-end lg:flex-nowrap">
            <Badge variant="secondary">{jagodaNutrition.protein}p</Badge>
            <Badge variant="secondary">{jagodaNutrition.fat}f</Badge>
            <Badge variant="secondary">{jagodaNutrition.carbs}c</Badge>
          </div>
        </div>
      </div>

      
        <div className="space-y-2 rounded-lg border border-border bg-card px-2 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-[52px] shrink-0 text-sm leading-4 font-normal text-muted-foreground">
              Nelson
            </span>
            <span className="text-sm font-normal text-foreground">
              {nelsonNutrition.calories} kcal
            </span>
            <div className="flex flex-nowrap items-center gap-1 justify-end ml-auto pl-6 md:w-full md:ml-0 md:pl-0 md:justify-start md:flex-wrap lg:w-auto lg:ml-auto lg:pl-6 lg:justify-end lg:flex-nowrap">
              <Badge variant="secondary">{nelsonNutrition.protein}p</Badge>
              <Badge variant="secondary">{nelsonNutrition.fat}f</Badge>
              <Badge variant="secondary">{nelsonNutrition.carbs}c</Badge>
            </div>
          </div>
        </div>
 
    </div>
  );
}
