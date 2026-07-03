import type { getPlanById } from "@/lib/db/planner";
import type { getRecipes } from "@/lib/db/recipes";
import type { ensureSelfFamilyMember } from "@/lib/db/family-members";
import { getDefaultUnitIdForIngredient } from "@/lib/ingredients/default-unit";
import { getFamilyMemberIngredientAmountPerMeal } from "@/lib/log/helpers";

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
  return params.recipe.ingredients
    .map((recipeIngredient) => {
      if (recipeIngredient.amount == null) {
        return null;
      }

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
        cookingFamilyMemberIds: params.recipe.audienceMembers.map(
          (member) => member.familyMemberId,
        ),
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
