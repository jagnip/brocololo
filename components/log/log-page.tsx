import { notFound } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import { getLogById } from "@/lib/db/logs";
import { getPlannerPoolItemsForPlan } from "@/lib/db/planner";
import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";
import {
  buildLogDays,
  buildVisiblePlannerPoolCards,
} from "@/lib/log/view-model";
import { LogDayViewController } from "@/components/log/log-day-view";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";
type LogDetailPageContainerProps = {
  logId: string;
  person?: string;
  day?: string;
};

function parsePerson(input?: string): "PRIMARY" | "SECONDARY" {
  if (input === LogPerson.SECONDARY) return LogPerson.SECONDARY;
  return LogPerson.PRIMARY;
}

function toRecipeSelectorRows(params: {
  recipe: Awaited<ReturnType<typeof getRecipes>>[number];
  person: "PRIMARY" | "SECONDARY";
}) {
  const selectedPerson =
    params.person === LogPerson.PRIMARY ? "primary" : "secondary";

  return params.recipe.ingredients
    .map((recipeIngredient) => {
      if (recipeIngredient.amount == null) {
        return null;
      }

      const amountForPerson = getPersonIngredientAmountPerMeal({
        amount: recipeIngredient.amount,
        nutritionTarget: recipeIngredient.nutritionTarget ?? "BOTH",
        person: selectedPerson,
        recipeServings: params.recipe.servings,
        servingMultiplierForNelson:
          params.recipe.servingMultiplierForNelson ?? 1,
      });
      if (amountForPerson == null || amountForPerson <= 0) {
        return null;
      }

      const defaultUnitId = getDefaultUnitIdForIngredient({
        defaultUnitId: recipeIngredient.ingredient.defaultUnitId,
        unitConversions: recipeIngredient.ingredient.unitConversions,
      });

      const row = {
        ingredientId: recipeIngredient.ingredient.id,
        unitId: recipeIngredient.unit?.id ?? defaultUnitId,
        amount: Math.round(amountForPerson * 1000) / 1000,
      };
      if (!row.unitId) {
        return null;
      }

      return row;
    })
    .filter(
      (row): row is { ingredientId: string; unitId: string; amount: number } =>
        row != null,
    );
}

export async function LogPage({
  logId,
  person: rawPerson,
  day,
}: LogDetailPageContainerProps) {
  const person = parsePerson(rawPerson);

  const [log, ingredients, recipes, ingredientFormDependencies] =
    await Promise.all([
      getLogById(logId, person),
      getIngredients(),
      getRecipes(undefined),
      getIngredientFormDependencies(),
    ]);
  if (!log) notFound();

  const days = buildLogDays(log.entries);
  const poolItemsRaw = await getPlannerPoolItemsForPlan({
    planId: log.plan.id,
    person,
  });
  const plannerPool = buildVisiblePlannerPoolCards({
    items: poolItemsRaw.map((item) => ({
      ...item,
      dateKey: item.date.toISOString().slice(0, 10),
      mealLabel:
        item.mealType === "BREAKFAST"
          ? "Breakfast"
          : item.mealType === "LUNCH"
            ? "Lunch"
            : item.mealType === "SNACK"
              ? "Snack"
              : "Dinner",
    })),
    entries: log.entries,
  });

  const recipeOptions = recipes.map((recipe) => ({
    id: recipe.id,
    name: recipe.name,
    initialRows: toRecipeSelectorRows({ recipe, person }),
  }));

  const ingredientOptions = ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    brand: ingredient.brand,
    descriptor: ingredient.descriptor,
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
  }));

  return (
    <LogDayViewController
      days={days}
      plannerPool={plannerPool}
      initialSelectedDayKey={day}
      logId={logId}
      person={person}
      recipeOptions={recipeOptions}
      ingredientOptions={ingredientOptions}
      ingredientFormDependencies={ingredientFormDependencies}
    />
  );
}
