"use client";

import { Badge } from "../ui/badge";
import { RecipeType } from "@/types/recipe";
import { IngredientType } from "@/types/ingredient";
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
import {
  RecipePageProvider,
  useRecipePageAddToLogData,
  useRecipePageHeaderData,
} from "@/components/context/recipe-page-context";

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
  return (
    <RecipePageProvider recipe={recipe} ingredients={ingredients}>
      <RecipePageContent
        ingredients={ingredients}
        ingredientFormDependencies={ingredientFormDependencies}
      />
    </RecipePageProvider>
  );
}

type RecipePageContentProps = {
  ingredients: IngredientType[];
  ingredientFormDependencies: RecipePageProps["ingredientFormDependencies"];
};

function RecipePageContent({
  ingredients,
  ingredientFormDependencies,
}: RecipePageContentProps) {
  const [isAddToLogOpen, setIsAddToLogOpen] = useState(false);
  const { recipe } = useRecipePageHeaderData();
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

          <NutritionSection />

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
