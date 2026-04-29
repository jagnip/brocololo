import { notFound } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import { getPlanById } from "@/lib/db/planner";
import { getRecipes } from "@/lib/db/recipes";
import { getLogByPlanId } from "@/lib/db/logs";
import { getPlannerPoolItemsForPlan } from "@/lib/db/planner";
import { getIngredients } from "@/lib/db/ingredients";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { buildLogDays, buildVisiblePlannerPoolCards } from "@/lib/log/view-model";
import type { DateRangeValue } from "@/components/planner/date-range-picker";
import { PlannerLogSharedShell } from "@/components/planner/planner-log-shared-shell";

type PlannerLogCombinedPageProps = {
  planId: string;
  tab?: string;
  person?: string;
};

function parsePerson(input?: string): "PRIMARY" | "SECONDARY" {
  if (input === LogPerson.SECONDARY) return LogPerson.SECONDARY;
  return LogPerson.PRIMARY;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toInitialDateRange(planSlots: Awaited<ReturnType<typeof getPlanById>>): DateRangeValue {
  if (!planSlots || planSlots.length === 0) {
    const today = toDateKey(new Date());
    return { start: today, end: today };
  }
  const keys = planSlots.map((slot) => toDateKey(slot.date));
  const start = keys.reduce((min, key) => (key < min ? key : min), keys[0]!);
  const end = keys.reduce((max, key) => (key > max ? key : max), keys[0]!);
  return { start, end };
}

function toRecipeSelectorRows(params: {
  recipe: Awaited<ReturnType<typeof getRecipes>>[number];
  person: "PRIMARY" | "SECONDARY";
}) {
  const selectedPerson = params.person === LogPerson.PRIMARY ? "primary" : "secondary";

  return params.recipe.ingredients
    .map((recipeIngredient) => {
      if (recipeIngredient.amount == null) return null;

      const amountForPerson = getPersonIngredientAmountPerMeal({
        amount: recipeIngredient.amount,
        nutritionTarget: recipeIngredient.nutritionTarget ?? "BOTH",
        person: selectedPerson,
        recipeServings: params.recipe.servings,
        servingMultiplierForNelson: params.recipe.servingMultiplierForNelson ?? 1,
      });
      if (amountForPerson == null || amountForPerson <= 0) return null;

      const defaultUnitId = getDefaultUnitIdForIngredient({
        defaultUnitId: recipeIngredient.ingredient.defaultUnitId,
        unitConversions: recipeIngredient.ingredient.unitConversions,
      });
      const row = {
        ingredientId: recipeIngredient.ingredient.id,
        unitId: recipeIngredient.unit?.id ?? defaultUnitId,
        amount: Math.round(amountForPerson * 1000) / 1000,
      };
      if (!row.unitId) return null;
      return row;
    })
    .filter((row): row is { ingredientId: string; unitId: string; amount: number } => row != null);
}

export async function PlannerLogCombinedPage({
  planId,
  tab,
  person: rawPerson,
}: PlannerLogCombinedPageProps) {
  const person = parsePerson(rawPerson);
  const initialTab = tab === "log" ? "log" : "plan";

  // Shared page fetches both planner and log dependencies once, then delegates interactions to client.
  const [planSlots, plannerRecipes, log, allRecipes, ingredients] = await Promise.all([
    getPlanById(planId),
    getRecipes(undefined, undefined, false),
    getLogByPlanId(planId, person),
    getRecipes(undefined),
    getIngredients(),
  ]);

  if (!planSlots) notFound();

  const initialDateRange = toInitialDateRange(planSlots);

  let logData: {
    logId: string;
    days: ReturnType<typeof buildLogDays>;
    plannerPool: ReturnType<typeof buildVisiblePlannerPoolCards>;
    recipeOptions: Array<{
      id: string;
      name: string;
      initialRows: { ingredientId: string; unitId: string; amount: number }[];
    }>;
    ingredientOptions: Array<{
      id: string;
      name: string;
      brand: string | null;
      descriptor: string | null;
      defaultUnitId: string | null;
      calories: number;
      proteins: number;
      fats: number;
      carbs: number;
      unitConversions: Array<{
        unitId: string;
        gramsPerUnit: number;
        unitName: string;
        unitNamePlural: string | null;
      }>;
    }>;
  } | null = null;

  if (log) {
    const days = buildLogDays(log.entries);
    const poolItemsRaw = await getPlannerPoolItemsForPlan({ planId, person });
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

    const recipeOptions = allRecipes.map((recipe) => ({
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

    logData = {
      logId: log.id,
      days,
      plannerPool,
      recipeOptions,
      ingredientOptions,
    };
  }

  return (
    <PlannerLogSharedShell
      planId={planId}
      initialTab={initialTab}
      initialDateRange={initialDateRange}
      initialPlan={planSlots}
      plannerRecipes={plannerRecipes}
      person={person}
      logData={logData}
    />
  );
}
