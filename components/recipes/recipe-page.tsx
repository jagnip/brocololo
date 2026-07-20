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
import { CookingForStripe } from "@/components/recipes/recipe-page/cooking-for-stripe";
import { NotesSection } from "@/components/recipes/recipe-page/notes-section";
import { RecipeAddToLogDialogContainer } from "@/components/recipes/recipe-page/add-to-log/add-to-log-dialog-container";
import { RecipeDeleteDialog } from "@/components/recipes/recipe-delete-dialog";
import {
  useRecipePageAddToLogData,
  useRecipePageBaseData,
  useRecipePageCookingForData,
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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { recipe, ingredients, familyMembers } = useRecipePageBaseData();
  const cookingForData = useRecipePageCookingForData();
  const addToLogData = useRecipePageAddToLogData();

  useEffect(() => {
    setIsAddToLogOpen(false);
    setIsDeleteOpen(false);
  }, [recipe.id]);

  const ingredientOptionsForLogDialog = useMemo<LogIngredientOption[]>(
    () =>
      ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        brand: ingredient.brand,
        descriptor: ingredient.descriptor,
        category: { name: ingredient.category.name },
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

  const recipeCategoryBadges = useMemo(() => {
    const mealOccasions = recipe.categories.filter(
      (category) => category.type === "MEAL_OCCASION",
    );
    const proteins = recipe.categories.filter(
      (category) => category.type === "PROTEIN",
    );
    const recipeTypes = recipe.categories.filter(
      (category) => category.type === "RECIPE_TYPE",
    );
    return { mealOccasions, proteins, recipeTypes };
  }, [recipe.categories]);

  const topbarConfig = useMemo(
    () => ({
      breadcrumbs: [
        {
          label: "Recipes",
          href: ROUTES.recipes,
          preserveQuery: "all" as const,
        },
        { label: recipe.name },
      ],
      actions: [
        {
          id: "add-to-log",
          label: "Add to log",
          onClick: () => setIsAddToLogOpen(true),
          variant: "outline" as const,
          size: "default" as const,
        },
      ],
      overflowMenu: {
        ariaLabel: "Recipe actions",
        items: [
          {
            id: "edit-recipe",
            label: "Edit recipe",
            href: ROUTES.recipeEdit(recipe.slug),
          },
          {
            id: "delete-recipe",
            label: "Delete recipe",
            destructive: true,
            onSelect: () => setIsDeleteOpen(true),
          },
        ],
      },
    }),
    [recipe.name, recipe.slug],
  );
  return (
    <div className="page-container">
      <TopbarConfigController config={topbarConfig} />

      <div className="grid grid-cols-1 gap-block md:grid-cols-5 md:gap-block">
        {/* Full-width header: title → badges */}
        <div className="order-1 md:order-0 md:col-span-5 flex flex-col">
          <PageHeader title={recipe.name} />
        </div>

        <div className="order-2 md:order-0 md:col-span-5 flex gap-item flex-wrap">
          <Badge variant="outline">Hands-on: {recipe.handsOnTime} min</Badge>
          <Badge variant="outline">Total: {recipe.totalTime} min</Badge>
          {recipeCategoryBadges.mealOccasions.map((category) => (
            <Badge key={category.id} variant="secondary">
              {category.name}
            </Badge>
          ))}
          {recipeCategoryBadges.proteins.map((category) => (
            <Badge key={category.id} variant="secondary">
              {category.name}
            </Badge>
          ))}
          {recipeCategoryBadges.recipeTypes.map((category) => (
            <Badge key={category.id} variant="secondary">
              {category.name}
            </Badge>
          ))}
          {recipe.excludeFromPlanner ? (
            <Badge variant="secondary">Excluded from planner</Badge>
          ) : null}
        </div>

        {/* Photos left, nutrition right — photo stretches to match nutrition height. */}
        <div className="order-3 md:order-0 md:col-span-3 md:h-full">
          <ImageGallery images={recipe.images || []} fillHeight />
        </div>

        <div className="order-5 md:order-0 md:col-span-2 md:h-full">
          <NutritionSection />
        </div>

        {/* Full-width cooking for under the photos/nutrition row. */}
        <div className="order-4 md:order-0 md:col-span-5">
          <CookingForStripe {...cookingForData} />
        </div>

        {/* Left column: instructions, notes */}
        <div className="contents md:col-span-3 md:block md:space-y-block">
          <div className="order-7 md:order-0 md:mb-block">
            <InstructionsSection />
          </div>

          <div className="order-8 md:order-0">
            <NotesSection />
          </div>
        </div>

        {/* Right column: ingredients */}
        <div className="contents md:col-span-2 md:block md:space-y-block">
          <div className="order-6 md:order-0">
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
          familyMembers={familyMembers}
          audienceMemberIds={addToLogData.audienceMemberIds}
          memberPortions={addToLogData.memberPortions}
          cookingFamilyMemberIds={addToLogData.cookingFamilyMemberIds}
          recipeServings={addToLogData.recipeServings}
          mealCount={addToLogData.mealCount}
          availableLogDateKeys={addToLogData.availableLogDateKeys}
          ingredientOptions={ingredientOptionsForLogDialog}
          ingredientFormDependencies={ingredientFormDependencies}
        />
      ) : null}
      <RecipeDeleteDialog
        recipeId={recipe.id}
        recipeName={recipe.name}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </div>
  );
}
