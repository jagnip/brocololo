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
      <h3 className="text text-base leading-5 font-semibold">
        Nutrition (per serving)
      </h3>

      <div className="space-y-1.5 rounded-lg border border-border bg-card px-2 py-2">
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
              // className="h-8 w-16 [appearance:textfield] rounded-md border-input bg-background px-2 text-center text-sm leading-4 font-normal text-foreground [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label="Calories per portion"
            />
            <span className="text-sm leading-4 font-normal text-foreground">
              kcal
            </span>
          </div>
          <div className="flex flex-nowrap items-center gap-1 justify-end ml-auto pl-6 md:w-full md:ml-0 md:pl-0 md:justify-start md:flex-wrap lg:w-auto lg:ml-auto lg:pl-6 lg:justify-end lg:flex-nowrap">
            <Badge variant="outline">{jagodaNutrition.protein}p</Badge>
            <Badge variant="outline">{jagodaNutrition.fat}f</Badge>
            <Badge variant="outline">{jagodaNutrition.carbs}c</Badge>
          </div>
        </div>
      </div>

      
        <div className="space-y-1.5 rounded-lg border border-border bg-card px-2 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-[52px] shrink-0 text-sm leading-4 font-normal text-muted-foreground">
              Nelson
            </span>
            <span className="text-sm font-normal text-foreground">
              {nelsonNutrition.calories} kcal
            </span>
            <div className="flex flex-nowrap items-center gap-1 justify-end ml-auto pl-6 md:w-full md:ml-0 md:pl-0 md:justify-start md:flex-wrap lg:w-auto lg:ml-auto lg:pl-6 lg:justify-end lg:flex-nowrap">
              <Badge variant="outline">{nelsonNutrition.protein}p</Badge>
              <Badge variant="outline">{nelsonNutrition.fat}f</Badge>
              <Badge variant="outline">{nelsonNutrition.carbs}c</Badge>
            </div>
          </div>
        </div>
 
    </div>
  );
}
