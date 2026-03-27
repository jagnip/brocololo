import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { IngredientType } from "@/types/ingredient";
import type { RecipeType } from "@/types/recipe";
import { IngredientItem } from "@/components/recipes/ingredient-item";
import { isScaleModified } from "@/lib/recipes/helpers";
import { useRecipePageIngredientsSectionData } from "@/components/context/recipe-page-context";
import { PortionSplitCard } from "@/components/recipes/recipe-page/portion-split-card";

export function IngredientsSection() {
  const {
    recipe,
    ingredients,
    currentServings,
    jagodaPortionFactor,
    nelsonPortionFactor,
    hasActiveScaling,
    localScaleByIngredientId,
    selectedUnits,
    ungroupedIngredients,
    visibleGroupedIngredients,
    onReset,
    onServingsChange,
    onUnitChange,
    getIngredientDisplayScalingFactor,
    getIngredientCalorieFactor,
    onAmountEdit,
    onApplyScaleToAll,
    onIngredientChange,
  } = useRecipePageIngredientsSectionData();

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Ingredients</h3>
          {hasActiveScaling && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onReset}
              aria-label="Reset ingredient amounts"
            >
              <RotateCcw  />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onServingsChange(currentServings - 2)}
            disabled={currentServings <= 2}
            aria-label="Decrease servings"
          >
            <Minus />
          </Button>
          <span className="text-sm font-base min-w-12 text-center">
            {currentServings} {currentServings === 1 ? "serving" : "servings"}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onServingsChange(currentServings + 2)}
            aria-label="Increase servings"
          >
            <Plus />
          </Button>
        </div>
      </div>
      <PortionSplitCard
        jagodaPortionFactor={jagodaPortionFactor}
        nelsonPortionFactor={nelsonPortionFactor}
        nelsonMultiplier={recipe.servingMultiplierForNelson}
      />

      {ungroupedIngredients.length > 0 ? (
        <div className="mb-2">
          {/* Keep uncategorized ingredients first and unlabeled. */}
          <ul className="space-y-2 text-sm">
            {ungroupedIngredients.map((recipeIngredient) => (
              <IngredientItem
                key={recipeIngredient.id}
                recipeIngredient={recipeIngredient}
                selectedUnitId={
                  selectedUnits[recipeIngredient.id] || recipeIngredient.unit?.id || null
                }
                onUnitChange={(unitId) => onUnitChange(recipeIngredient.id, unitId)}
                servingScalingFactor={getIngredientDisplayScalingFactor(recipeIngredient.id)}
                calorieScalingFactor={getIngredientCalorieFactor(
                  recipeIngredient.nutritionTarget,
                )}
                onAmountEdit={(ratio, activeCalorieScalingFactor) =>
                  onAmountEdit(recipeIngredient.id, ratio, activeCalorieScalingFactor)
                }
                showApplyScaleAction={isScaleModified(
                  localScaleByIngredientId[recipeIngredient.id] ?? 1,
                )}
                onApplyScaleToAll={() => onApplyScaleToAll(recipeIngredient.id)}
                onIngredientChange={(ingredientId) =>
                  onIngredientChange(recipeIngredient.id, ingredientId)
                }
                replacementCandidates={ingredients}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {visibleGroupedIngredients.map((group) => (
        <div key={group.id} className="mb-2">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.name}
          </h4>
          <ul className="space-y-2 text-sm">
            {group.ingredients.map((recipeIngredient) => (
              <IngredientItem
                key={recipeIngredient.id}
                recipeIngredient={recipeIngredient}
                selectedUnitId={
                  selectedUnits[recipeIngredient.id] || recipeIngredient.unit?.id || null
                }
                onUnitChange={(unitId) => onUnitChange(recipeIngredient.id, unitId)}
                servingScalingFactor={getIngredientDisplayScalingFactor(recipeIngredient.id)}
                calorieScalingFactor={getIngredientCalorieFactor(
                  recipeIngredient.nutritionTarget,
                )}
                onAmountEdit={(ratio, activeCalorieScalingFactor) =>
                  onAmountEdit(recipeIngredient.id, ratio, activeCalorieScalingFactor)
                }
                showApplyScaleAction={isScaleModified(
                  localScaleByIngredientId[recipeIngredient.id] ?? 1,
                )}
                onApplyScaleToAll={() => onApplyScaleToAll(recipeIngredient.id)}
                onIngredientChange={(ingredientId) =>
                  onIngredientChange(recipeIngredient.id, ingredientId)
                }
                replacementCandidates={ingredients}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
