import { notFound } from "next/navigation";
import { LogPerson } from "@/src/generated/enums";
import { ROUTES } from "@/lib/constants";
import { getLogById } from "@/lib/db/logs";
import { getPlannerPoolItemsForPlan } from "@/lib/db/planner";
import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { getPersonIngredientAmountPerMeal } from "@/lib/log/helpers";
import { LogPersonSelect } from "@/components/log/log-person-select";
import { buildLogDays, buildVisiblePlannerPoolCards } from "@/lib/log/view-model";
import { LogDayView } from "@/components/log/log-day-view";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DeleteLogButton } from "@/components/log/delete-log-button";

type LogDetailPageContainerProps = {
  logId: string;
  person?: string;
  day?: string;
};

function formatDateRange(start: Date, end: Date): string {
  // Keep period label concise and consistent with the log list page.
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

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

export async function LogDetailPageContainer({
  logId,
  person: rawPerson,
  day,
}: LogDetailPageContainerProps) {
  const person = parsePerson(rawPerson);

  const [log, ingredients, recipes, ingredientFormDependencies] = await Promise.all([
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
  const logPeriodLabel = formatDateRange(log.plan.startDate, log.plan.endDate);

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Log details</h1>
        <div className="flex items-center gap-2">
          <LogPersonSelect value={person} />
          <DeleteLogButton logId={logId} />
        </div>
      </header>
      <Breadcrumbs
        items={[
          { label: "Logs", href: ROUTES.log },
          { label: logPeriodLabel },
        ]}
      />

      <LogDayView
        days={days}
        plannerPool={plannerPool}
        initialSelectedDayKey={day}
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
        ingredientFormDependencies={ingredientFormDependencies}
      />
    </>
  );
}
