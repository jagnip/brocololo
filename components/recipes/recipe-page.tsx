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
  formatInstructionIngredientBadge,
  getPrimaryCalorieScalingFactorForTarget,
  getIngredientDisplay,
  isScaleModified,
  isInstructionIngredientVisibleForPerson,
  getInstructionIngredientPersonFactor,
  IngredientSwapMap,
} from "@/lib/recipes/helpers";
import { ImageGallery } from "./image-gallery";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "../ui/button";
import { Minus, Pencil, Plus, RotateCcw } from "lucide-react";
import { IngredientItem } from "./ingredient-item";
import { Input } from "../ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FLAVOUR_BREADCRUMB_LABELS, ROUTES } from "@/lib/constants";
import { parseMarkdownLinks } from "@/lib/recipes/text-formatting";
import { toast } from "sonner";
import { addRecipeToLogAction } from "@/actions/log-actions";
import {
  EditLogIngredientsDialog,
  type EditableIngredientRow,
  type LogIngredientOption,
} from "@/components/log/edit-log-ingredients-dialog";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { LogMealType, LogPerson } from "@/src/generated/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

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

const LOG_MEAL_OPTIONS = [
  { value: LogMealType.BREAKFAST, label: "Breakfast" },
  { value: LogMealType.LUNCH, label: "Lunch" },
  { value: LogMealType.SNACK, label: "Snack" },
  { value: LogMealType.DINNER, label: "Dinner" },
] as const;

function toDateInputValue(date: Date) {
  return date.toLocaleDateString("en-CA");
}

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
  const [isAddingToLog, startAddToLogTransition] = useTransition();
  const [logPerson, setLogPerson] = useState<"PRIMARY" | "SECONDARY">(
    LogPerson.PRIMARY,
  );
  const [logDate, setLogDate] = useState(() => toDateInputValue(new Date()));
  const [logMealType, setLogMealType] = useState<
    "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER"
  >(LogMealType.DINNER);
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const flavourLabel =
    categorySlug && categorySlug in FLAVOUR_BREADCRUMB_LABELS
      ? FLAVOUR_BREADCRUMB_LABELS[categorySlug]
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
    setLogPerson(LogPerson.PRIMARY);
    setLogDate(toDateInputValue(new Date()));
    setLogMealType(LogMealType.DINNER);
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

  const addToLogInitialRows = useMemo<EditableIngredientRow[]>(() => {
    const selectedPerson = logPerson === LogPerson.PRIMARY ? "primary" : "secondary";
    const rows: EditableIngredientRow[] = [];

    for (const recipeIngredient of recipeForScaledNutrition.ingredients) {
      if (recipeIngredient.amount == null) {
        continue;
      }

      const scaledAmount = recipeIngredient.amount * servingScalingFactor;
      const amountForPerson = getPersonIngredientAmountPerMeal({
        amount: scaledAmount,
        nutritionTarget: recipeIngredient.nutritionTarget,
        person: selectedPerson,
        recipeServings: currentServings,
        servingMultiplierForNelson: recipe.servingMultiplierForNelson,
      });
      if (amountForPerson == null || amountForPerson <= 0) {
        continue;
      }

      const defaultUnitId = getDefaultUnitIdForIngredient({
        defaultUnitId: recipeIngredient.ingredient.defaultUnitId,
        unitConversions: recipeIngredient.ingredient.unitConversions,
      });

      rows.push({
        ingredientId: recipeIngredient.ingredient.id,
        unitId: recipeIngredient.unit?.id ?? defaultUnitId,
        amount: Math.round(amountForPerson * 1000) / 1000,
      });
    }

    return rows;
  }, [
    currentServings,
    logPerson,
    recipe.servingMultiplierForNelson,
    recipeForScaledNutrition.ingredients,
    servingScalingFactor,
  ]);

  const handleOpenAddToLogDialog = () => {
    setLogPerson(LogPerson.PRIMARY);
    setLogDate(toDateInputValue(new Date()));
    setLogMealType(LogMealType.DINNER);
    setIsAddToLogOpen(true);
  };
  const selectedMealLabel =
    LOG_MEAL_OPTIONS.find((option) => option.value === logMealType)?.label ?? "Dinner";

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
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{recipe.name}</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpenAddToLogDialog}
        >
          Add to log
        </Button>
        {/* Quick access to recipe editing from the detail page. */}
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${recipe.name}`}
        >
          <Link href={ROUTES.recipeEdit(recipe.slug)}>
            <Pencil className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.recipes}>Recipes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {flavourLabel && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`${ROUTES.recipes}?category=${categorySlug}`}
                >
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
                  onChange={(e) => handleCaloriesChange(e.target.value)}
                  placeholder={jagodaNutrition.calories.toString()}
                  className="w-20 h-7 text-xs"
                  aria-label="Calories per portion"
                />
                calories
              </div>
              <Badge variant="outline">
                {jagodaNutrition.protein}g protein
              </Badge>
              <Badge variant="outline">{jagodaNutrition.fat}g fat</Badge>
              <Badge variant="outline">{jagodaNutrition.carbs}g carbs</Badge>
            </div>

            {/* Nelson's nutrition — read-only, only for 2+ servings */}
            {currentServings >= 2 && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-muted-foreground w-12">
                  Nelson
                </span>
                <Badge variant="outline">
                  {nelsonNutrition.calories} calories
                </Badge>
                <Badge variant="outline">
                  {nelsonNutrition.protein}g protein
                </Badge>
                <Badge variant="outline">{nelsonNutrition.fat}g fat</Badge>
                <Badge variant="outline">{nelsonNutrition.carbs}g carbs</Badge>
              </div>
            )}
          </div>

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

          {/* Instructions Section */}
          {recipe.instructions && recipe.instructions.length > 0 && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Instructions</h3>
                {/* Keep this local, lightweight segmented control consistent with existing button-group patterns. */}
                <div
                  className="flex items-center gap-1"
                  role="radiogroup"
                  aria-label="Instruction person filter"
                >
                  {(["jagoda", "nelson"] as const).map((person) => {
                    const isSelected = selectedInstructionPerson === person;
                    const label = person === "jagoda" ? "Jagoda" : "Nelson";
                    return (
                      <Button
                        key={person}
                        type="button"
                        size="sm"
                        role="radio"
                        aria-checked={isSelected}
                        variant={isSelected ? "default" : "outline"}
                        onClick={() =>
                          setSelectedInstructionPerson((prev) =>
                            prev === person ? null : person,
                          )
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                {recipe.instructions.map((instruction) => (
                  <li key={instruction.id}>
                    <div>
                      {renderTextWithMarkdownLinks(
                        instruction.text,
                        `instruction-${instruction.id}`,
                      )}
                    </div>
                    {instruction.ingredients.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {instruction.ingredients.map((link) => {
                          const recipeIngredient =
                            effectiveRecipeIngredientById.get(
                              link.recipeIngredient.id,
                            ) ?? link.recipeIngredient;
                          // Filter instruction badges by selected person, but keep step text visible.
                          if (
                            !isInstructionIngredientVisibleForPerson(
                              recipeIngredient.nutritionTarget,
                              selectedInstructionPerson,
                            )
                          ) {
                            return null;
                          }
                          const selectedUnitId =
                            selectedUnits[recipeIngredient.id] ||
                            recipeIngredient.unit?.id ||
                            null;
                          const personFactor = getInstructionIngredientPersonFactor(
                            recipeIngredient.nutritionTarget,
                            selectedInstructionPerson,
                            jagodaPortionFactor,
                            nelsonPortionFactor,
                          );
                          const display = getIngredientDisplay(
                            recipeIngredient.amount,
                            recipeIngredient.unit?.id ?? null,
                            recipeIngredient.unit?.name ?? null,
                            selectedUnitId,
                            recipeIngredient.ingredient.unitConversions,
                            getIngredientDisplayScalingFactor(recipeIngredient.id) *
                              personFactor,
                            getIngredientCalorieFactor(recipeIngredient.nutritionTarget),
                          );

                          return (
                            <Badge
                              key={`${instruction.id}-${recipeIngredient.id}`}
                              variant="outline"
                            >
                              {formatInstructionIngredientBadge({
                                rawAmount: display.rawAmount,
                                rawAmountInGrams: display.rawAmountInGrams,
                                displayAmount: display.displayAmount,
                                displayUnitName: display.displayUnitName,
                                displayUnitNamePlural: display.displayUnitNamePlural,
                                ingredientName:
                                  recipeIngredient.ingredient.name,
                                additionalInfo: recipeIngredient.additionalInfo,
                              })}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Ingredients Section */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Ingredients</h3>
                  {hasActiveScaling && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleReset}
                      aria-label="Reset ingredient amounts"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => handleServingsChange(currentServings - 2)}
                    disabled={currentServings <= 2}
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
                    onClick={() => handleServingsChange(currentServings + 2)}
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

              {ungroupedIngredients.length > 0 ? (
                <div className="mb-3">
                  {/* Keep uncategorized ingredients first and unlabeled. */}
                  <ul className="space-y-1 text-sm">
                    {ungroupedIngredients.map((recipeIngredient) => (
                      <IngredientItem
                        key={recipeIngredient.id}
                        recipeIngredient={recipeIngredient}
                        selectedUnitId={
                          selectedUnits[recipeIngredient.id] ||
                          recipeIngredient.unit?.id ||
                          null
                        }
                        onUnitChange={(unitId) =>
                          setSelectedUnits((prev) => ({
                            ...prev,
                            [recipeIngredient.id]: unitId,
                          }))
                        }
                        servingScalingFactor={getIngredientDisplayScalingFactor(
                          recipeIngredient.id,
                        )}
                        calorieScalingFactor={getIngredientCalorieFactor(
                          recipeIngredient.nutritionTarget,
                        )}
                        onAmountEdit={(ratio, activeCalorieScalingFactor) =>
                          handleIngredientEdit(
                            recipeIngredient.id,
                            ratio,
                            activeCalorieScalingFactor,
                          )
                        }
                        showApplyScaleAction={isScaleModified(
                          localScaleByIngredientId[recipeIngredient.id] ?? 1,
                        )}
                        onApplyScaleToAll={() =>
                          handleApplyScaleToAll(recipeIngredient.id)
                        }
                        onIngredientChange={(ingredientId) =>
                          handleIngredientChange(recipeIngredient.id, ingredientId)
                        }
                        replacementCandidates={ingredients}
                      />
                    ))}
                  </ul>
                </div>
              ) : null}

              {visibleGroupedIngredients.map((group) => (
                <div key={group.id} className="mb-3">
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.name}
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {group.ingredients.map((recipeIngredient) => (
                      <IngredientItem
                        key={recipeIngredient.id}
                        recipeIngredient={recipeIngredient}
                        selectedUnitId={
                          selectedUnits[recipeIngredient.id] ||
                          recipeIngredient.unit?.id ||
                          null
                        }
                        onUnitChange={(unitId) =>
                          setSelectedUnits((prev) => ({
                            ...prev,
                            [recipeIngredient.id]: unitId,
                          }))
                        }
                        servingScalingFactor={getIngredientDisplayScalingFactor(
                          recipeIngredient.id,
                        )}
                        calorieScalingFactor={getIngredientCalorieFactor(
                          recipeIngredient.nutritionTarget,
                        )}
                        onAmountEdit={(ratio, activeCalorieScalingFactor) =>
                          handleIngredientEdit(
                            recipeIngredient.id,
                            ratio,
                            activeCalorieScalingFactor,
                          )
                        }
                        showApplyScaleAction={isScaleModified(
                          localScaleByIngredientId[recipeIngredient.id] ?? 1,
                        )}
                        onApplyScaleToAll={() =>
                          handleApplyScaleToAll(recipeIngredient.id)
                        }
                        onIngredientChange={(ingredientId) =>
                          handleIngredientChange(recipeIngredient.id, ingredientId)
                        }
                        replacementCandidates={ingredients}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {isAddToLogOpen ? (
        <EditLogIngredientsDialog
          open={isAddToLogOpen}
          title={`Add ${recipe.name} to log`}
          subtitle={`${selectedMealLabel} • ${logDate}`}
          initialRows={addToLogInitialRows}
          ingredientOptions={ingredientOptionsForLogDialog}
          ingredientFormDependencies={ingredientFormDependencies}
          isSaving={isAddingToLog}
          saveLabel="Add to log"
          contextControls={
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <p className="text-xs tracking-wide uppercase text-muted-foreground font-semibold">
                  Person
                </p>
                <Select
                  value={logPerson}
                  onValueChange={(nextValue) =>
                    setLogPerson(nextValue as "PRIMARY" | "SECONDARY")
                  }
                  disabled={isAddingToLog}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LogPerson.PRIMARY}>Jagoda</SelectItem>
                    <SelectItem value={LogPerson.SECONDARY}>Nelson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs tracking-wide uppercase text-muted-foreground font-semibold">
                  Date
                </p>
                <Input
                  type="date"
                  value={logDate}
                  max="9999-12-31"
                  onChange={(event) => setLogDate(event.target.value)}
                  disabled={isAddingToLog}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs tracking-wide uppercase text-muted-foreground font-semibold">
                  Meal occasion
                </p>
                <Select
                  value={logMealType}
                  onValueChange={(nextValue) =>
                    setLogMealType(nextValue as "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER")
                  }
                  disabled={isAddingToLog}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_MEAL_OPTIONS.map((meal) => (
                      <SelectItem key={meal.value} value={meal.value}>
                        {meal.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
          onOpenChange={(open) => {
            setIsAddToLogOpen(open);
          }}
          onSave={async (rows) => {
            if (!logDate) {
              toast.error("Date is required");
              return;
            }

            startAddToLogTransition(async () => {
              const completeRows = rows.filter(
                (row): row is { ingredientId: string; unitId: string; amount: number } =>
                  row.ingredientId != null &&
                  row.unitId != null &&
                  row.amount != null &&
                  row.amount > 0,
              );
              const result = await addRecipeToLogAction({
                recipeId: recipe.id,
                person: logPerson,
                date: logDate,
                mealType: logMealType,
                ingredients: completeRows,
              });

              if (result.type === "error") {
                toast.error(result.message);
                return;
              }

              setIsAddToLogOpen(false);
              toast.success("Recipe added to log");
            });
          }}
        />
      ) : null}
    </div>
  );
}
