import { notFound } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import { getLogById } from "@/lib/db/logs";
import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";
import { LogPersonSelect } from "@/components/log/log-person-select";
import { buildLogDays } from "@/lib/log/view-model";
import { LogDayView } from "@/components/log/log-day-view";

type LogDetailPageProps = {
  params: Promise<{ logId: string }>;
  searchParams: Promise<{ person?: string }>;
};

function parsePerson(input?: string): "PRIMARY" | "SECONDARY" {
  if (input === LogPerson.SECONDARY) return LogPerson.SECONDARY;
  return LogPerson.PRIMARY;
}

function toRecipeSelectorRows(params: {
  recipe: Awaited<ReturnType<typeof getRecipes>>[number];
  person: "PRIMARY" | "SECONDARY";
}) {
  const selectedPerson = params.person === LogPerson.PRIMARY ? "primary" : "secondary";

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
        servingMultiplierForNelson: params.recipe.servingMultiplierForNelson ?? 1,
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
    .filter((row): row is { ingredientId: string; unitId: string; amount: number } => row != null);
}

export default async function LogDetailPage({
  params,
  searchParams,
}: LogDetailPageProps) {
  const { logId } = await params;
  const { person: rawPerson } = await searchParams;
  const person = parsePerson(rawPerson);

  const [log, ingredients, recipes] = await Promise.all([
    getLogById(logId, person),
    getIngredients(),
    getRecipes([]),
  ]);
  if (!log) notFound();
  const days = buildLogDays(log.entries);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Log details</h1>
        <LogPersonSelect value={person} />
      </header>

      <LogDayView
        days={days}
        logId={logId}
        person={person}
        recipeOptions={recipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          initialRows: toRecipeSelectorRows({ recipe, person }),
        }))}
        ingredientOptions={ingredients.map((ingredient) => ({
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
        }))}
      />
    </div>
  );
}
