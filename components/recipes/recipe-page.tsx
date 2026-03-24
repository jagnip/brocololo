"use client";

import { Badge } from "../ui/badge";
import { ImageGallery } from "./image-gallery";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FLAVOUR_BREADCRUMB_LABELS, ROUTES } from "@/lib/constants";
import { type LogIngredientOption } from "@/components/log/edit-log-ingredients-dialog";
import { TopbarConfigController } from "@/components/topbar/topbar-config";
import { NutritionSection } from "@/components/recipes/recipe-page/nutrition-section";
import { InstructionsSection } from "@/components/recipes/recipe-page/instructions-section";
import { IngredientsSection } from "@/components/recipes/recipe-page/ingredients-section";
import { NotesSection } from "@/components/recipes/recipe-page/notes-section";
import { RecipeAddToLogDialog } from "@/components/recipes/recipe-page/recipe-add-to-log-dialog";
import {
  useRecipePageAddToLogData,
  useRecipePageBaseData,
} from "@/components/context/recipe-page-context";

type RecipePageProps = {
  ingredientFormDependencies: {
    categories: Array<{ id: string; name: string }>;
    units: Array<{ id: string; name: string; namePlural: string | null }>;
    gramsUnitId: string;
    iconOptions: string[];
  };
};

export default function RecipePage({
  ingredientFormDependencies,
}: RecipePageProps) {
  const [isAddToLogOpen, setIsAddToLogOpen] = useState(false);
  const { recipe, ingredients } = useRecipePageBaseData();
  const addToLogData = useRecipePageAddToLogData();
  const searchParams = useSearchParams();
  const flavourSlug = searchParams.get("flavour");
  const flavourLabel =
    flavourSlug && flavourSlug in FLAVOUR_BREADCRUMB_LABELS
      ? FLAVOUR_BREADCRUMB_LABELS[flavourSlug]
      : null;

  useEffect(() => {
    setIsAddToLogOpen(false);
  }, [recipe.id, recipe.servings]);

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

          <NutritionSection />

          <NotesSection />

          <InstructionsSection />

          <IngredientsSection />
        </div>
      </div>
      {isAddToLogOpen ? (
        <RecipeAddToLogDialog
          recipeId={addToLogData.recipeId}
          recipeName={addToLogData.recipeName}
          open={isAddToLogOpen}
          onOpenChange={setIsAddToLogOpen}
          recipeIngredients={addToLogData.recipeIngredients}
          currentServings={addToLogData.currentServings}
          servingScalingFactor={addToLogData.servingScalingFactor}
          servingMultiplierForNelson={addToLogData.servingMultiplierForNelson}
          ingredientOptions={ingredientOptionsForLogDialog}
          ingredientFormDependencies={ingredientFormDependencies}
        />
      ) : null}
    </div>
  );
}
