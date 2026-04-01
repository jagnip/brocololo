"use client";

import { Badge } from "../ui/badge";
import { ImageGallery } from "./image-gallery";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/lib/constants";
import { type LogIngredientOption } from "@/components/log/log-ingredients-form";
import { PageHeader } from "@/components/page-header";
import { TopbarConfigController } from "@/components/topbar-config";
import { NutritionSection } from "@/components/recipes/recipe-page/nutrition-section";
import { InstructionsSection } from "@/components/recipes/recipe-page/instructions-section";
import { IngredientsSection } from "@/components/recipes/recipe-page/ingredients-section";
import { NotesSection } from "@/components/recipes/recipe-page/notes-section";
import { RecipeAddToLogDialogContainer } from "@/components/recipes/recipe-page/add-to-log/add-to-log-dialog-container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
    }),
    [recipe.slug],
  );
  return (
    <div className="page-container">
      <TopbarConfigController config={topbarConfig} />

      <div className="grid grid-cols-1 gap-block md:grid-cols-5 md:gap-block">
        <div className="order-1 md:order-0 md:col-span-5 flex flex-col gap-tight">
          <PageHeader title={recipe.name} />
          <Breadcrumbs
            // Keep list context when users navigate back to the recipes index.
            items={[
              {
                label: "Recipes",
                href: ROUTES.recipes,
                preserveQuery: ["q", "flavour", "protein", "type", "time"],
              },
              // Keep detail crumb stable across recipe renames and long titles.
              { label: "This recipe" },
            ]}
          />
        </div>

        <div className="contents md:col-span-3 md:block md:space-y-block">
          <div className="order-2 md:order-0 overflow-hidden rounded-xl">
            <ImageGallery images={recipe.images || []} />
          </div>

          <div className="order-5 md:order-0">
            <InstructionsSection />
          </div>

          <div className="order-6 md:order-0">
            <NotesSection />
          </div>
        </div>

        <div className="contents md:col-span-2 md:block md:space-y-block">
          <div className="order-3 md:order-0 flex flex-col gap-block">
            <div className="flex gap-item flex-wrap">
              <Badge variant="secondary">
                Hands-on: {recipe.handsOnTime} min
              </Badge>
              <Badge variant="secondary">Total: {recipe.totalTime} min</Badge>
              {recipe.excludeFromPlanner ? (
                <Badge variant="secondary">Excluded from planner</Badge>
              ) : null}
            </div>
            <NutritionSection />
          </div>

          <div className="order-4 md:order-0">
            <IngredientsSection />
          </div>
        </div>
      </div>
      {isAddToLogOpen ? (
        <RecipeAddToLogDialogContainer
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
