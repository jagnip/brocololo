import { notFound } from "next/navigation";
import { getLogById } from "@/lib/db/logs";
import { getPlanById, getPlannerPoolItemsForPlan } from "@/lib/db/planner";
import { getIngredients } from "@/lib/db/ingredients";
import { getRecipes } from "@/lib/db/recipes";
import { buildLogMealSelectorOptions } from "@/lib/log/meal-selector-options";
import {
  buildLogDays,
  buildVisiblePlannerPoolCards,
} from "@/lib/log/view-model";
import { LogDayViewController } from "@/components/log/log-day-view";
import { getIngredientFormDependencies } from "@/components/ingredients/form/form-dependencies";
import { requireUser } from "@/lib/auth/session";
import { ensureSelfFamilyMember } from "@/lib/db/family-members";
type LogDetailPageContainerProps = {
  logId: string;
  memberId?: string;
  day?: string;
};

export async function LogPage({
  logId,
  memberId: rawMemberId,
  day,
}: LogDetailPageContainerProps) {
  const { id: userId } = await requireUser();
  const familyMembers = await ensureSelfFamilyMember(userId);
  const selectedFamilyMember =
    familyMembers.find((member) => member.id === rawMemberId) ??
    familyMembers.find((member) => member.isSelf) ??
    familyMembers[0];
  if (!selectedFamilyMember) notFound();

  const [log, ingredients, recipes, ingredientFormDependencies] =
    await Promise.all([
      getLogById(userId, logId, selectedFamilyMember.id),
      getIngredients(userId),
      getRecipes(userId),
      getIngredientFormDependencies(),
    ]);
  if (!log) notFound();

  const planSlots = (await getPlanById(userId, log.plan.id)) ?? [];

  const days = buildLogDays(log.entries);
  const poolItemsRaw = await getPlannerPoolItemsForPlan({
    userId,
    planId: log.plan.id,
    familyMemberId: selectedFamilyMember.id,
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

  const recipeOptions = buildLogMealSelectorOptions({
    recipes,
    planSlots,
    familyMemberId: selectedFamilyMember.id,
    familyMembers,
  });

  const ingredientOptions = ingredients.map((ingredient) => ({
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
  }));

  return (
    <LogDayViewController
      days={days}
      familyMembers={familyMembers}
      plannerPool={plannerPool}
      initialSelectedDayKey={day}
      logId={logId}
      familyMemberId={selectedFamilyMember.id}
      recipeOptions={recipeOptions}
      ingredientOptions={ingredientOptions}
      ingredientFormDependencies={ingredientFormDependencies}
    />
  );
}
