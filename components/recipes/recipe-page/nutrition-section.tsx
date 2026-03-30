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
    <div className="flex flex-col gap-item">
      <h3 className="type-h2">
        Nutrition (per serving)
      </h3>

      <div className="flex flex-col gap-item rounded-lg border border-border bg-card px-nest py-nest">
        <div className="flex flex-wrap items-center gap-item">
        
            <span className="w-[52px] shrink-0 type-body leading-4 text-muted-foreground">
              Jagoda
            </span>
      
          <div className="flex items-center gap-tight">
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
            <span className="type-body leading-4 text-foreground">
              kcal
            </span>
          </div>
          <div className="flex flex-nowrap items-center gap-tight justify-end ml-auto pl-6 md:w-full md:ml-0 md:pl-0 md:justify-start md:flex-wrap lg:w-auto lg:ml-auto lg:pl-6 lg:justify-end lg:flex-nowrap">
            <Badge variant="secondary">{jagodaNutrition.protein}p</Badge>
            <Badge variant="secondary">{jagodaNutrition.fat}f</Badge>
            <Badge variant="secondary">{jagodaNutrition.carbs}c</Badge>
          </div>
        </div>
      </div>

      
        <div className="flex flex-col gap-item rounded-lg border border-border bg-card px-nest py-nest">
          <div className="flex flex-wrap items-center gap-item">
            <span className="w-[52px] shrink-0 type-body leading-4 text-muted-foreground">
              Nelson
            </span>
            <span className="type-body text-foreground">
              {nelsonNutrition.calories} kcal
            </span>
            <div className="flex flex-nowrap items-center gap-tight justify-end ml-auto pl-6 md:w-full md:ml-0 md:pl-0 md:justify-start md:flex-wrap lg:w-auto lg:ml-auto lg:pl-6 lg:justify-end lg:flex-nowrap">
              <Badge variant="secondary">{nelsonNutrition.protein}p</Badge>
              <Badge variant="secondary">{nelsonNutrition.fat}f</Badge>
              <Badge variant="secondary">{nelsonNutrition.carbs}c</Badge>
            </div>
          </div>
        </div>
 
    </div>
  );
}
