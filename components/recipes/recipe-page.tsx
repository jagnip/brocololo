"use client";

import { Badge } from "../ui/badge";
import { RecipeType } from "@/types/recipe";
import {
  calculateNutritionPerServing,
  calculateServingScalingFactor,
  scaleNutritionByCalories,
} from "@/lib/utils";
import { ImageGallery } from "./image-gallery";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Minus, Plus } from "lucide-react";
import { Input } from "../ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { useSearchParams } from "next/navigation";
import { FLAVOUR_BREADCRUMB_LABELS } from "@/lib/constants";

type RecipePageProps = {
  recipe: RecipeType;
};

export default function RecipePage({ recipe }: RecipePageProps) {
  const [currentServings, setCurrentServings] = useState(recipe.servings);
  const [targetCaloriesPerPortion, setTargetCaloriesPerPortion] = useState<
    number | null
  >(null);
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const flavourLabel =
    categorySlug && categorySlug in FLAVOUR_BREADCRUMB_LABELS
      ? FLAVOUR_BREADCRUMB_LABELS[categorySlug]
      : null;

  useEffect(() => {
    setCurrentServings(recipe.servings);
  }, [recipe.servings]);

  const baseNutrition = calculateNutritionPerServing(recipe);

  const scaledNutrition = scaleNutritionByCalories(
    baseNutrition,
    targetCaloriesPerPortion ?? baseNutrition.calories,
  );

  const calorieScalingFactor =
    targetCaloriesPerPortion && baseNutrition.calories > 0
      ? targetCaloriesPerPortion / baseNutrition.calories
      : 1;

  const handleCaloriesChange = (caloriesString: string) => {
    const calories = parseFloat(caloriesString);

    if (isNaN(calories) || calories <= 0) {
      setTargetCaloriesPerPortion(null);
    } else {
      setTargetCaloriesPerPortion(calories);
    }
  };

  const { servingScalingFactor, jagodaPortionFactor, nelsonPortionFactor } =
    calculateServingScalingFactor(
      currentServings,
      recipe.servings,
      recipe.servingMultiplierForNelson,
    );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{recipe.name}</h1>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/recipes">Recipes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {flavourLabel && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/recipes?category=${categorySlug}`}>
                  {flavourLabel}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{recipe.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Image Section */}
        <div className="shrink-0 md:w-1/2">
          <div className="overflow-hidden rounded-xl">
            <ImageGallery images={recipe.images || []} />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 space-y-6">
          {/* Time and Portion Badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge>Hands-on time: {recipe.handsOnTime} minutes</Badge>
            <Badge>Total time: {recipe.totalTime} minutes</Badge>
            {recipe.excludeFromPlanner && (
              <Badge variant="outline">Excluded from meal planner</Badge>
            )}
          </div>

          {/* Nutrition Section */}
          <div>
            <h3 className="font-semibold mb-2">Nutrition (per portion)</h3>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="1"
                  step="10"
                  value={targetCaloriesPerPortion?.toString() ?? ""}
                  onChange={(e) => handleCaloriesChange(e.target.value)}
                  placeholder={scaledNutrition.calories.toString()}
                  className="w-20 h-7 text-xs"
                  aria-label="Calories per portion"
                />
                calories
              </div>
              <Badge variant="outline">
                {scaledNutrition.protein}g protein
              </Badge>
              <Badge variant="outline">{scaledNutrition.fat}g fat</Badge>
              <Badge variant="outline">{scaledNutrition.carbs}g carbs</Badge>
            </div>
          </div>

          {/* Notes Section */}
          {recipe.notes && recipe.notes.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {recipe.notes.map((note: string, index: number) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions Section */}
          {recipe.instructions && recipe.instructions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Instructions</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {recipe.instructions.map(
                  (instruction: string, index: number) => (
                    <li key={index}>{instruction}</li>
                  ),
                )}
              </ol>
            </div>
          )}

          {/* Ingredients Section */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Ingredients</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setCurrentServings(currentServings - 1)}
                    disabled={currentServings === 1}
                    aria-label="Decrease servings"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-12 text-center">
                    {currentServings}{" "}
                    {currentServings === 1 ? "serving" : "servings"}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setCurrentServings(currentServings + 1)}
                    aria-label="Increase servings"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded">
                <div>Jagoda: {jagodaPortionFactor.toFixed(1)}</div>
                <div>
                  Nelson: {nelsonPortionFactor.toFixed(1)} (
                  {recipe.servingMultiplierForNelson}x)
                </div>
              </div>

              <ul className="list-disc list-inside space-y-1 text-sm">
                {recipe.ingredients.map((recipeIngredient) => (
                  <li key={recipeIngredient.id}>
                    {recipeIngredient.amount && (
                      <>
                        {(
                          recipeIngredient.amount *
                          servingScalingFactor *
                          calorieScalingFactor
                        ).toFixed(1)}{" "}
                        {recipeIngredient.unit.name}{" "}
                      </>
                    )}{" "}
                    {recipeIngredient.ingredient.name}{" "}
                    {recipeIngredient.additionalInfo && (
                      <span className="text-muted-foreground text-xs ml-1">
                        ({recipeIngredient.additionalInfo})
                      </span>
                    )}
                    {recipeIngredient.excludeFromNutrition && (
                      <span className="text-muted-foreground text-xs ml-1">
                        (excluded)
                      </span>
                    )}
                    {recipeIngredient.ingredient.supermarketUrl && (
                      <a
                        href={recipeIngredient.ingredient.supermarketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:underline text-xs"
                      >
                        🛒
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
