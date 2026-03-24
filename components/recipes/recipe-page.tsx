"use client";

import { Badge } from "../ui/badge";
import { RecipeType } from "@/types/recipe";
import { IngredientType } from "@/types/ingredient";
import {
  buildEffectiveRecipeForSimulation,
  computeGlobalScaleFromEditedRow,
  applyEditRatioToLocalScale,
  calculateNutritionPerServing,
  calculateServingScalingFactor,
  getPrimaryCalorieScalingFactorForTarget,
  isScaleModified,
  IngredientSwapMap,
} from "@/lib/recipes/helpers";
import { ImageGallery } from "./image-gallery";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FLAVOUR_BREADCRUMB_LABELS, ROUTES } from "@/lib/constants";
import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import { type LogIngredientOption } from "@/components/log/edit-log-ingredients-dialog";
import { TopbarConfigController } from "@/components/topbar/topbar-config";
import { NutritionSection } from "@/components/recipes/recipe-page/nutrition-section";
import { InstructionsSection } from "@/components/recipes/recipe-page/instructions-section";
import { IngredientsSection } from "@/components/recipes/recipe-page/ingredients-section";
import { RecipeAddToLogDialog } from "@/components/recipes/recipe-page/recipe-add-to-log-dialog";

type RecipePageProps = {
  recipe: RecipeType;
  ingredients: IngredientType[];
  ingredientFormDependencies: {
    categories: Array<{ id: string; name: string }>;
    units: Array<{ id: string; name: string; namePlural: string | null }>;
    gramsUnitId: string;
    iconOptions: string[];
  };
};

export default function RecipePage({
  recipe,
  ingredients,
  ingredientFormDependencies,
}: RecipePageProps) {
  const [currentServings, setCurrentServings] = useState(recipe.servings);
  const [targetCaloriesPerPortion, setTargetCaloriesPerPortion] = useState<
    number | null
  >(null);
  const [globalScaleRatio, setGlobalScaleRatio] = useState(1);
  const [localScaleByIngredientId, setLocalScaleByIngredientId] = useState<
    Record<string, number>
  >({});
  const [swapsByRecipeIngredientId, setSwapsByRecipeIngredientId] =
    useState<IngredientSwapMap>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string | null>>(
    {},
  );
  const [selectedInstructionPerson, setSelectedInstructionPerson] = useState<
    "jagoda" | "nelson" | null
  >(null);
  const [isAddToLogOpen, setIsAddToLogOpen] = useState(false);
  const searchParams = useSearchParams();
  const flavourSlug = searchParams.get("flavour");
  const flavourLabel =
    flavourSlug && flavourSlug in FLAVOUR_BREADCRUMB_LABELS
      ? FLAVOUR_BREADCRUMB_LABELS[flavourSlug]
      : null;

  useEffect(() => {
    setCurrentServings(recipe.servings);
    setSelectedUnits({});
    setGlobalScaleRatio(1);
    setLocalScaleByIngredientId({});
    setSwapsByRecipeIngredientId({});
    // Reset person instruction filter when navigating to another recipe.
    setSelectedInstructionPerson(null);
    setIsAddToLogOpen(false);
  }, [recipe.id, recipe.servings]);

  const effectiveRecipe = useMemo(
    () =>
      buildEffectiveRecipeForSimulation(
        recipe,
        swapsByRecipeIngredientId,
        ingredients,
      ),
    [recipe, swapsByRecipeIngredientId, ingredients],
  );

  const effectiveRecipeIngredientById = useMemo(
    () =>
      new Map(
        effectiveRecipe.ingredients.map((recipeIngredient) => [
          recipeIngredient.id,
          recipeIngredient,
        ]),
      ),
    [effectiveRecipe.ingredients],
  );

  const originalRecipeIngredientById = useMemo(
    () =>
      new Map(
        recipe.ingredients.map((recipeIngredient) => [
          recipeIngredient.id,
          recipeIngredient,
        ]),
      ),
    [recipe.ingredients],
  );

  const jagodaBaseNutrition = calculateNutritionPerServing(
    effectiveRecipe,
    "primary",
  );
  const calorieScalingFactor =
    targetCaloriesPerPortion && jagodaBaseNutrition.calories > 0
      ? targetCaloriesPerPortion / jagodaBaseNutrition.calories
      : 1;

  const recipeForScaledNutrition = useMemo(
    () => ({
      ...effectiveRecipe,
      ingredients: effectiveRecipe.ingredients.map((ingredientRow) => {
        if (ingredientRow.amount == null) {
          return ingredientRow;
        }
        // Compose base-anchored global + per-row local scales for nutrition math.
        const rowScaleRatio =
          localScaleByIngredientId[ingredientRow.id] ?? 1;
        const calorieFactor = getPrimaryCalorieScalingFactorForTarget(
          ingredientRow.nutritionTarget,
          calorieScalingFactor,
        );
        return {
          ...ingredientRow,
          amount:
            ingredientRow.amount * globalScaleRatio * rowScaleRatio * calorieFactor,
        };
      }),
    }),
    [calorieScalingFactor, effectiveRecipe, globalScaleRatio, localScaleByIngredientId],
  );

  const jagodaNutrition = calculateNutritionPerServing(
    recipeForScaledNutrition,
    "primary",
  );
  const nelsonNutrition = calculateNutritionPerServing(
    recipeForScaledNutrition,
    "secondary",
  );

  const handleCaloriesChange = (caloriesString: string) => {
    const calories = parseFloat(caloriesString);

    if (isNaN(calories) || calories <= 0) {
      setTargetCaloriesPerPortion(null);
    } else {
      // Keep calorie target mode deterministic by clearing row/global edits.
      setGlobalScaleRatio(1);
      setLocalScaleByIngredientId({});
      setTargetCaloriesPerPortion(calories);
    }
  };

  const handleServingsChange = (newServings: number) => {
    setCurrentServings(newServings);
    // Serving changes restart from base amounts to avoid compounded state.
    setGlobalScaleRatio(1);
    setLocalScaleByIngredientId({});
  };

  const handleIngredientEdit = (
    recipeIngredientId: string,
    ratio: number,
    activeCalorieScalingFactor: number,
  ) => {
    // Default behavior: edit only the touched row, not the entire recipe.
    setLocalScaleByIngredientId((prev) => {
      const currentLocalScale = prev[recipeIngredientId] ?? 1;
      const nextLocalScale = applyEditRatioToLocalScale(
        currentLocalScale,
        ratio,
        activeCalorieScalingFactor,
      );
      const next = { ...prev };
      if (isScaleModified(nextLocalScale)) {
        next[recipeIngredientId] = nextLocalScale;
      } else {
        delete next[recipeIngredientId];
      }
      return next;
    });
    setTargetCaloriesPerPortion(null);
  };

  const handleApplyScaleToAll = (recipeIngredientId: string) => {
    // One-time global apply: use the clicked row as source-of-truth, then clear row deltas.
    setGlobalScaleRatio((prevGlobalScale) => {
      const rowLocalScale = localScaleByIngredientId[recipeIngredientId] ?? 1;
      return computeGlobalScaleFromEditedRow(prevGlobalScale, rowLocalScale);
    });
    setLocalScaleByIngredientId({});
  };

  const handleReset = () => {
    setGlobalScaleRatio(1);
    setLocalScaleByIngredientId({});
    setTargetCaloriesPerPortion(null);
    setSwapsByRecipeIngredientId({});
    setSelectedUnits({});
  };

  const handleIngredientChange = (
    recipeIngredientId: string,
    selectedIngredientId: string,
  ) => {
    const originalRecipeIngredient = originalRecipeIngredientById.get(
      recipeIngredientId,
    );
    if (!originalRecipeIngredient) {
      return;
    }

    setSwapsByRecipeIngredientId((prev) => {
      const next = { ...prev };

      if (selectedIngredientId === originalRecipeIngredient.ingredient.id) {
        delete next[recipeIngredientId];
        return next;
      }

      next[recipeIngredientId] = selectedIngredientId;
      return next;
    });

    // Reset unit selection for this row after a swap to avoid stale unit IDs.
    setSelectedUnits((prev) => {
      const next = { ...prev };
      delete next[recipeIngredientId];
      return next;
    });
    // Clear row-local edits for swapped rows to avoid stale ratio assumptions.
    setLocalScaleByIngredientId((prev) => {
      const next = { ...prev };
      delete next[recipeIngredientId];
      return next;
    });
  };

  const { servingScalingFactor, jagodaPortionFactor, nelsonPortionFactor } =
    calculateServingScalingFactor(
      currentServings,
      recipe.servings,
      recipe.servingMultiplierForNelson,
    );

  const getIngredientCalorieFactor = (
    nutritionTarget: "BOTH" | "PRIMARY_ONLY" | "SECONDARY_ONLY",
  ) => getPrimaryCalorieScalingFactorForTarget(nutritionTarget, calorieScalingFactor);

  const getIngredientDisplayScalingFactor = (
    recipeIngredientId: string,
  ) =>
    servingScalingFactor *
    globalScaleRatio *
    (localScaleByIngredientId[recipeIngredientId] ?? 1);

  const hasActiveScaling =
    globalScaleRatio !== 1 ||
    Object.keys(localScaleByIngredientId).length > 0 ||
    targetCaloriesPerPortion !== null ||
    Object.keys(swapsByRecipeIngredientId).length > 0;

  const ingredientOptionsForLogDialog = useMemo<LogIngredientOption[]>(
    () =>
      ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        brand: ingredient.brand,
        defaultUnitId: ingredient.defaultUnitId,
        calories: ingredient.calories,
        proteins: ingredient.proteins,
        fats: ingredient.fats,
        carbs: ingredient.carbs,
        unitConversions: ingredient.unitConversions.map((conversion) => ({
          unitId: conversion.unitId,
          gramsPerUnit: conversion.gramsPerUnit,
          unitName: conversion.unit.name,
          unitNamePlural: conversion.unit.namePlural ?? null,
        })),
      })),
    [ingredients],
  );

  const topbarConfig = useMemo(
    () => ({
      actions: [
        {
          id: "add-to-log",
          label: "Add to log",
          // Open only; dialog now owns add-to-log context state.
          onClick: () => setIsAddToLogOpen(true),
          variant: "outline" as const,
          size: "sm" as const,
        },
        {
          id: "edit-recipe",
          label: "Edit recipe",
          href: ROUTES.recipeEdit(recipe.slug),
          variant: "default" as const,
          size: "sm" as const,
        },
      ],
      badge: recipe.excludeFromPlanner
        ? {
            label: "Excluded from meal planner",
            variant: "outline" as const,
          }
        : undefined,
    }),
    [recipe.excludeFromPlanner, recipe.slug],
  );
  const orderedIngredientGroups = useMemo(
    () =>
      [...recipe.ingredientGroups].sort((a, b) => a.position - b.position),
    [recipe.ingredientGroups],
  );
  const ungroupedIngredients = useMemo(
    () =>
      effectiveRecipe.ingredients
        .filter((ingredient) => ingredient.groupId == null)
        .sort((a, b) => a.position - b.position),
    [effectiveRecipe.ingredients],
  );
  const groupedIngredients = useMemo(
    () =>
      orderedIngredientGroups.map((group) => ({
        ...group,
        ingredients: effectiveRecipe.ingredients
          .filter((ingredient) => ingredient.groupId === group.id)
          .sort((a, b) => a.position - b.position),
      })),
    [effectiveRecipe.ingredients, orderedIngredientGroups],
  );
  // Hide empty groups on detail page to keep sections focused on actual items.
  const visibleGroupedIngredients = useMemo(
    () => groupedIngredients.filter((group) => group.ingredients.length > 0),
    [groupedIngredients],
  );

  const renderTextWithMarkdownLinks = (text: string, keyPrefix: string) => {
    // Render markdown links safely without injecting HTML.
    return parseMarkdownLinks(text).map((segment, index) => {
      if (segment.type === "link") {
        return (
          <a
            key={`${keyPrefix}-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 break-all"
          >
            {segment.label}
          </a>
        );
      }

      return <span key={`${keyPrefix}-${index}`}>{segment.content}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <TopbarConfigController config={topbarConfig} />
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{recipe.name}</h1>
      </div>
   
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
          </div>

          <NutritionSection
            currentServings={currentServings}
            targetCaloriesPerPortion={targetCaloriesPerPortion}
            jagodaNutrition={jagodaNutrition}
            nelsonNutrition={nelsonNutrition}
            onCaloriesChange={handleCaloriesChange}
          />

          {/* Notes Section */}
          {recipe.notes && recipe.notes.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {recipe.notes.map((note: string, index: number) => (
                  <li key={index}>
                    {renderTextWithMarkdownLinks(note, `note-${index}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <InstructionsSection
            instructions={recipe.instructions}
            effectiveRecipeIngredientById={effectiveRecipeIngredientById}
            selectedInstructionPerson={selectedInstructionPerson}
            setSelectedInstructionPerson={setSelectedInstructionPerson}
            selectedUnits={selectedUnits}
            jagodaPortionFactor={jagodaPortionFactor}
            nelsonPortionFactor={nelsonPortionFactor}
            getIngredientDisplayScalingFactor={getIngredientDisplayScalingFactor}
            getIngredientCalorieFactor={getIngredientCalorieFactor}
            renderTextWithMarkdownLinks={renderTextWithMarkdownLinks}
          />

          <IngredientsSection
            recipe={recipe}
            ingredients={ingredients}
            currentServings={currentServings}
            jagodaPortionFactor={jagodaPortionFactor}
            nelsonPortionFactor={nelsonPortionFactor}
            hasActiveScaling={hasActiveScaling}
            localScaleByIngredientId={localScaleByIngredientId}
            selectedUnits={selectedUnits}
            ungroupedIngredients={ungroupedIngredients}
            visibleGroupedIngredients={visibleGroupedIngredients}
            onReset={handleReset}
            onServingsChange={handleServingsChange}
            onUnitChange={(recipeIngredientId, unitId) =>
              setSelectedUnits((prev) => ({
                ...prev,
                [recipeIngredientId]: unitId,
              }))
            }
            getIngredientDisplayScalingFactor={getIngredientDisplayScalingFactor}
            getIngredientCalorieFactor={getIngredientCalorieFactor}
            onAmountEdit={handleIngredientEdit}
            onApplyScaleToAll={handleApplyScaleToAll}
            onIngredientChange={handleIngredientChange}
          />
        </div>
      </div>
      {isAddToLogOpen ? (
        <RecipeAddToLogDialog
          recipeId={recipe.id}
          recipeName={recipe.name}
          open={isAddToLogOpen}
          onOpenChange={setIsAddToLogOpen}
          recipeIngredients={recipeForScaledNutrition.ingredients}
          currentServings={currentServings}
          servingScalingFactor={servingScalingFactor}
          servingMultiplierForNelson={recipe.servingMultiplierForNelson}
          ingredientOptions={ingredientOptionsForLogDialog}
          ingredientFormDependencies={ingredientFormDependencies}
        />
      ) : null}
    </div>
  );
}
