import { notFound } from "next/navigation";
import { getPlanById, getPlansCached } from "@/lib/db/planner";
import { getRecipes } from "@/lib/db/recipes";
import { getLogByPlanId } from "@/lib/db/logs";
import { getPlannerPoolItemsForPlan } from "@/lib/db/planner";
import { getIngredients } from "@/lib/db/ingredients";
import { getFamilyMemberIngredientAmountPerMeal } from "@/lib/log/helpers";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { buildLogDays, buildVisiblePlannerPoolCards } from "@/lib/log/view-model";
import type { DateRangeValue } from "@/components/planner/date-range-picker";
import { PlannerLogSharedShell } from "@/components/planner/planner-log-shared-shell";
import type { LogIngredientOption } from "@/components/log/log-ingredients-form";
import { planHasShoppingList } from "@/lib/db/shopping-list";
import { formatDateRangeLabel } from "@/lib/format-date-range-label";
import { requireUser } from "@/lib/auth/session";
import { ensureSelfFamilyMember } from "@/lib/db/family-members";

type PlannerLogCombinedPageProps = {
  planId: string;
  tab?: string;
  memberId?: string;
};

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
  familyMemberId: string;
  familyMembers: Awaited<ReturnType<typeof ensureSelfFamilyMember>>;
}) {
  return params.recipe.ingredients
    .map((recipeIngredient) => {
      if (recipeIngredient.amount == null) return null;

      const amountForPerson = getFamilyMemberIngredientAmountPerMeal({
        amount: recipeIngredient.amount,
        appliesToEveryone: recipeIngredient.appliesToEveryone,
        targetFamilyMemberIds: recipeIngredient.memberTargets.map(
          (target) => target.familyMemberId,
        ),
        familyMemberId: params.familyMemberId,
        recipeServings: params.recipe.servings,
        familyMembers: params.familyMembers,
        memberPortions: params.recipe.memberPortions,
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
  memberId: rawMemberId,
}: PlannerLogCombinedPageProps) {
  const { id: userId } = await requireUser();
  const initialTab = tab === "log" ? "log" : "plan";

  const [
    planSlots,
    plannerRecipes,
    allRecipes,
    ingredients,
    hasExistingShoppingList,
    allPlans,
    familyMembers,
  ] =
    await Promise.all([
      getPlanById(userId, planId),
      getRecipes(userId, undefined, undefined, false),
      getRecipes(userId),
      getIngredients(userId),
      planHasShoppingList(userId, planId),
      getPlansCached(userId),
      ensureSelfFamilyMember(userId),
    ]);

  if (!planSlots) notFound();
  const selectedFamilyMember =
    familyMembers.find((member) => member.id === rawMemberId) ??
    familyMembers.find((member) => member.isSelf) ??
    familyMembers[0];
  if (!selectedFamilyMember) notFound();
  const log = await getLogByPlanId(userId, planId, selectedFamilyMember.id);

  const initialDateRange = toInitialDateRange(planSlots);
  const planOptions = allPlans.map((plan) => ({
    id: plan.id,
    label: formatDateRangeLabel(plan.startDate, plan.endDate),
  }));

  let logData: {
    logId: string;
    days: ReturnType<typeof buildLogDays>;
    plannerPool: ReturnType<typeof buildVisiblePlannerPoolCards>;
    recipeOptions: Array<{
      id: string;
      name: string;
      initialRows: { ingredientId: string; unitId: string; amount: number }[];
    }>;
    ingredientOptions: LogIngredientOption[];
  } | null = null;

  if (log) {
    const days = buildLogDays(log.entries);
    const poolItemsRaw = await getPlannerPoolItemsForPlan({
      userId,
      planId,
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

    const recipeOptions = allRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      initialRows: toRecipeSelectorRows({
        recipe,
        familyMemberId: selectedFamilyMember.id,
        familyMembers,
      }),
    }));

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
      planOptions={planOptions}
      initialTab={initialTab}
      initialDateRange={initialDateRange}
      initialPlan={planSlots}
      plannerRecipes={plannerRecipes}
      familyMembers={familyMembers}
      familyMemberId={selectedFamilyMember.id}
      logData={logData}
      hasExistingShoppingList={hasExistingShoppingList}
    />
  );
}
