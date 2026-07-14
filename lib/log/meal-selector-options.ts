import type { getPlanById } from "@/lib/db/planner";
import type { getRecipes } from "@/lib/db/recipes";
import type { ensureSelfFamilyMember } from "@/lib/db/family-members";
import { resolveRecipeIngredientRowsForMember } from "@/lib/recipes/ingredient-adjustments";

export const REPOSITORY_MEAL_OPTION_PREFIX = "recipe:";
export const PLAN_IDEA_MEAL_OPTION_PREFIX = "idea:";

export type LogMealSelectorOptionKind = "repository" | "plan-idea";

export type LogMealSelectorOption = {
  id: string;
  name: string;
  kind: LogMealSelectorOptionKind;
  initialRows: Array<{
    ingredientId: string;
    unitId: string;
    amount: number;
  }>;
};

export function toRepositoryMealOptionId(recipeId: string): string {
  return `${REPOSITORY_MEAL_OPTION_PREFIX}${recipeId}`;
}

export function toPlanIdeaMealOptionId(customName: string): string {
  return `${PLAN_IDEA_MEAL_OPTION_PREFIX}${encodeURIComponent(customName)}`;
}

export function parseMealOptionId(
  optionId: string,
):
  | { kind: "repository"; recipeId: string }
  | { kind: "plan-idea"; customName: string }
  | null {
  if (optionId.startsWith(REPOSITORY_MEAL_OPTION_PREFIX)) {
    return {
      kind: "repository",
      recipeId: optionId.slice(REPOSITORY_MEAL_OPTION_PREFIX.length),
    };
  }

  if (optionId.startsWith(PLAN_IDEA_MEAL_OPTION_PREFIX)) {
    return {
      kind: "plan-idea",
      customName: decodeURIComponent(
        optionId.slice(PLAN_IDEA_MEAL_OPTION_PREFIX.length),
      ),
    };
  }

  return null;
}

/** Map namespaced selector value to upsertLogSlot meal fields. */
export function toUpsertLogSlotMealSelection(params: {
  selectedMealOptionId: string | null;
  planSlotId: string | null;
}): {
  recipeId: string | null;
  planIdeaCustomName: string | null;
  planSlotId: string | null;
} {
  if (!params.selectedMealOptionId) {
    return {
      recipeId: null,
      planIdeaCustomName: null,
      planSlotId: null,
    };
  }

  const parsed = parseMealOptionId(params.selectedMealOptionId);
  if (!parsed) {
    return {
      recipeId: null,
      planIdeaCustomName: null,
      planSlotId: null,
    };
  }

  if (parsed.kind === "repository") {
    return {
      recipeId: parsed.recipeId,
      planIdeaCustomName: null,
      planSlotId: null,
    };
  }

  return {
    recipeId: null,
    planIdeaCustomName: parsed.customName,
    planSlotId: params.planSlotId,
  };
}

function toRecipeSelectorRows(params: {
  recipe: Awaited<ReturnType<typeof getRecipes>>[number];
  familyMemberId: string;
  familyMembers: Awaited<ReturnType<typeof ensureSelfFamilyMember>>;
}) {
  const audienceMemberIds = params.recipe.audienceMembers.map(
    (member) => member.familyMemberId,
  );
  return resolveRecipeIngredientRowsForMember({
    recipeIngredients: params.recipe.ingredients.map((recipeIngredient) => ({
      id: recipeIngredient.id,
      ingredientId: recipeIngredient.ingredientId,
      amount: recipeIngredient.amount,
      unit: recipeIngredient.unit,
      additionalInfo: recipeIngredient.additionalInfo,
      memberAdjustments: recipeIngredient.memberAdjustments,
    })),
    familyMemberId: params.familyMemberId,
    recipeServings: params.recipe.servings,
    familyMembers: params.familyMembers,
    memberPortions: params.recipe.memberPortions,
    audienceMemberIds,
  });
}

function toPlanIdeaSelectorRows(
  ingredients: Array<{
    ingredientId: string;
    unitId: string | null;
    amount: number | null;
  }>,
) {
  return ingredients
    .filter(
      (
        row,
      ): row is { ingredientId: string; unitId: string; amount: number } =>
        row.ingredientId != null &&
        row.unitId != null &&
        row.amount != null &&
        row.amount > 0,
    )
    .map((row) => ({
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      amount: row.amount,
    }));
}

type PlanSlotRow = NonNullable<Awaited<ReturnType<typeof getPlanById>>>[number];

/** Repository recipes plus unique plan idea meal names for the log editor selector. */
export function buildLogMealSelectorOptions(params: {
  recipes: Awaited<ReturnType<typeof getRecipes>>;
  planSlots: PlanSlotRow[];
  familyMemberId: string;
  familyMembers: Awaited<ReturnType<typeof ensureSelfFamilyMember>>;
}): LogMealSelectorOption[] {
  const repositoryOptions: LogMealSelectorOption[] = params.recipes.map(
    (recipe) => ({
      id: toRepositoryMealOptionId(recipe.id),
      name: recipe.name,
      kind: "repository",
      initialRows: toRecipeSelectorRows({
        recipe,
        familyMemberId: params.familyMemberId,
        familyMembers: params.familyMembers,
      }),
    }),
  );

  const ideaMealsByName = new Map<string, LogMealSelectorOption>();
  for (const slot of params.planSlots) {
    if (slot.recipe != null || !slot.customMeal) {
      continue;
    }

    const customName = slot.customMeal.name;
    if (ideaMealsByName.has(customName)) {
      continue;
    }

    ideaMealsByName.set(customName, {
      id: toPlanIdeaMealOptionId(customName),
      name: customName,
      kind: "plan-idea",
      initialRows: toPlanIdeaSelectorRows(slot.customMeal.ingredients),
    });
  }

  return [...repositoryOptions, ...Array.from(ideaMealsByName.values())];
}

/** Resolve the namespaced selector id for a logged recipe card. */
export function mealOptionIdFromRecipeCard(params: {
  sourceRecipeId: string | null;
  planIdeaCustomName?: string | null;
}): string | null {
  if (params.sourceRecipeId) {
    return toRepositoryMealOptionId(params.sourceRecipeId);
  }

  if (params.planIdeaCustomName) {
    return toPlanIdeaMealOptionId(params.planIdeaCustomName);
  }

  return null;
}
