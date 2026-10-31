import { RecipeType } from "@/types/recipe";
import { SlotInputType } from "@/types/planner";
import { PlannerMealType } from "@/src/generated/enums";
import { differenceInDays } from "date-fns";
import { getProteinKey } from "./helpers";
import { PROTEIN_TARGETS } from "../constants";

//pickBestCandidate runs all scorers against all candidates for one slot at a time

export type ScoringContext = {
  assignedSlots: SlotInputType[];
  plannedRecipeSlots: SlotInputType[]; // preserved recipe slots plus recipes generated so far
  currentSlot: { date: Date; mealType: PlannerMealType };
  maxDaysSinceLastUsedCandidate: number; // max days since last used recipe in this pool of candidates
  fridgeIngredientIds: string[]; // ingredient IDs the user has in their fridge
  rollingRecipeIds: string[]; // recipe IDs the user wants included in the plan
  currentAudienceFamilyMemberIds: string[];
};

const RECIPE_PREFERENCE_SCORES = { LIKE: 0.5, LOVE: 1, AVOID: 0 } as const;
const RECIPE_PREFERENCE_WEIGHT = 1.75;
const RECIPE_PREFERENCE_MIX_WEIGHT = 3;
const RECIPE_PREFERENCE_TARGET = 0.5;

export function isRecipeAvoidedByAudience(
  recipe: Pick<RecipeType, "memberPreferences">,
  audienceIds: string[],
): boolean {
  return recipe.memberPreferences.some(
    (row) => row.preference === "AVOID" && audienceIds.includes(row.familyMemberId),
  );
}

export function isRecipePreferredByAudience(
  recipe: Pick<RecipeType, "memberPreferences">,
  audienceIds: string[],
): boolean {
  const audience = new Set(audienceIds);
  if (audience.size === 0) return false;
  return recipe.memberPreferences.some(
    (row) =>
      audience.has(row.familyMemberId) &&
      (row.preference === "LIKE" || row.preference === "LOVE"),
  );
}

export function scoreRecipePreferences(
  recipe: RecipeType,
  ctx: ScoringContext,
): number {
  const audienceIds = [...new Set(ctx.currentAudienceFamilyMemberIds)];
  if (audienceIds.length === 0) return 0;
  return recipe.memberPreferences.reduce(
    (sum, row) => sum + (
      audienceIds.includes(row.familyMemberId)
        ? RECIPE_PREFERENCE_SCORES[row.preference]
        : 0
    ),
    0,
  ) / audienceIds.length;
}

export function scoreRecipePreferenceMix(
  recipe: RecipeType,
  ctx: ScoringContext,
): number {
  const comparableSlots = ctx.plannedRecipeSlots.filter(
    (slot) =>
      slot.recipe !== null &&
      slot.mealType === ctx.currentSlot.mealType &&
      (slot.cookingFamilyMemberIds?.length ?? 0) > 0,
  );
  const preferredCount = comparableSlots.filter((slot) =>
    isRecipePreferredByAudience(slot.recipe!, slot.cookingFamilyMemberIds!),
  ).length;
  const targetCount = (comparableSlots.length + 1) * RECIPE_PREFERENCE_TARGET;
  const preferredDistance = Math.abs(preferredCount + 1 - targetCount);
  const otherDistance = Math.abs(preferredCount - targetCount);
  const candidateDistance = isRecipePreferredByAudience(
    recipe,
    ctx.currentAudienceFamilyMemberIds,
  )
    ? preferredDistance
    : otherDistance;
  const alternativeDistance = candidateDistance === preferredDistance
    ? otherDistance
    : preferredDistance;

  if (candidateDistance < alternativeDistance) return 1;
  if (candidateDistance > alternativeDistance) return 0;
  return 0.5;
}

type Scorer = {
  name: string;
  fn: (recipe: RecipeType, ctx: ScoringContext) => number;
  weight: number;
};

const scorers: Scorer[] = [
  { name: "lastUsed", fn: scoreLastUsed, weight: 2 },
  { name: "alreadyInPlan", fn: scoreAlreadyInPlan, weight: 3 },
  // { name: "proteinBalance", fn: scoreProteinBalance, weight: 2 },
  { name: "fridgeIngredients", fn: scoreFridgeIngredients, weight: 3 },
  { name: "rollingRecipe", fn: scoreRollingRecipe, weight: 10 },
  { name: "recipePreferenceMix", fn: scoreRecipePreferenceMix, weight: RECIPE_PREFERENCE_MIX_WEIGHT },
  { name: "recipePreferences", fn: scoreRecipePreferences, weight: RECIPE_PREFERENCE_WEIGHT },
];

// Returns raw score for Last used
export function scoreLastUsed(recipe: RecipeType, ctx: ScoringContext): number {
  if (!recipe.lastUsedInPlanner) return 1; // if the recipe has never been used in a plan, return 1
  if (ctx.maxDaysSinceLastUsedCandidate === 0) return 1; // if the max days since last used candidate is 0, return 1 (all candidates used same day - no difference in recency)
  const daysSinceThisRecipeUsed = differenceInDays(ctx.currentSlot.date, recipe.lastUsedInPlanner); // calculate the number of days since this recipe was last used
  return daysSinceThisRecipeUsed / ctx.maxDaysSinceLastUsedCandidate; // normalize the score to 0-1
}

// Returns raw score for Already in plan
export function scoreAlreadyInPlan(recipe: RecipeType, ctx: ScoringContext): number {
  const timesUsed = ctx.plannedRecipeSlots.filter(
    (s) => s.recipe?.id === recipe.id
  ).length;
  if (timesUsed === 0) return 1; // if the recipe has never been used in a plan, return 1
  return Math.max(1 - timesUsed * 0.5, 0); // normalize the score to 0-1
}

const MAX_ALTERNATIVES = 10;

export function pickBestCandidate(
  candidates: RecipeType[],
  ctx: ScoringContext
): { winner: RecipeType; alternatives: RecipeType[] } {
  // Score all candidates and sort by total score descending
  const scored = candidates.map((candidate) => ({
    recipe: candidate,
    score: scorers.reduce(
      (sum, { fn, weight }) => sum + fn(candidate, ctx) * weight,
      0
    ),
  }));

  scored.sort((a, b) => b.score - a.score);

  return {
    winner: scored[0]!.recipe,
    alternatives: scored.slice(1, MAX_ALTERNATIVES + 1).map((s) => s.recipe),
  };
}

// Scores how well this recipe's protein fits the target distribution
export function scoreProteinBalance(recipe: RecipeType, ctx: ScoringContext): number {
  const proteinKey = getProteinKey(recipe); // Resolves a recipe's protein category slug to its scoring group key e.g. "beef" → "red-meat", "chicken" → "chicken"
  if (!proteinKey) return 0.5; // no protein category — neutral score, it can go up to 1 (underreprenseted - if we want more) or down to 0 (overrepresented - if we want less)

  // Count only savoury slots (lunch + dinner) assigned so far
  const assignedSavourySlots = ctx.assignedSlots.filter(
    (s) =>
      s.mealType === PlannerMealType.LUNCH ||
      s.mealType === PlannerMealType.DINNER
  );

  // If no savoury slots assigned yet, score by target ratio directly
  if (assignedSavourySlots.length === 0) {
    return PROTEIN_TARGETS[proteinKey] ?? 0;
  }

  // Count how many assigned savoury slots use each protein key so far
  const proteinSlotsCounts: Record<string, number> = {};
  for (const slot of assignedSavourySlots) {
    if (!slot.recipe) continue;
    const key = getProteinKey(slot.recipe);
    if (key) {
      proteinSlotsCounts[key] = (proteinSlotsCounts[key] ?? 0) + 1;
    }
  }

  const totalSavourySlotsCount = assignedSavourySlots.length;
  const currentRatio = (proteinSlotsCounts[proteinKey] ?? 0) / totalSavourySlotsCount;
  const targetRatio = PROTEIN_TARGETS[proteinKey] ?? 0;

  // gap > 0 means underrepresented, gap < 0 means overrepresented
  const gap = targetRatio - currentRatio;

  // Clamp to 0–1: shift gap from [-1, 1] range to [0, 1]
  return Math.max(0, Math.min(1, 0.5 + gap));
}

// Scores how many of the recipe's ingredients the user already has in the fridge
// Ingredients already consumed by assigned recipes are removed from the pool
export function scoreFridgeIngredients(recipe: RecipeType, ctx: ScoringContext): number {
  if (ctx.fridgeIngredientIds.length === 0) return 0.5; // no fridge input — neutral

  // Subtract ingredients already consumed by assigned recipes
  const usedIngredientIds = new Set(
    ctx.assignedSlots.flatMap((s) => s.recipe?.ingredients.map((ri) => ri.ingredientId) ?? [])
  );
  const remainingFridgeIds = ctx.fridgeIngredientIds.filter((id) => !usedIngredientIds.has(id));

  if (remainingFridgeIds.length === 0) return 0.5; // all fridge ingredients already used — neutral

  const recipeIngredientIds = recipe.ingredients.map((ri) => ri.ingredientId);
  if (recipeIngredientIds.length === 0) return 0.5; // no ingredients — neutral

  const matches = recipeIngredientIds.filter(
    (id) => remainingFridgeIds.includes(id)
  ).length;
  return matches / remainingFridgeIds.length; //higher score = more remaining fridge ingredients match in the recipe
}

// Gives a massive boost to rolling recipes that haven't been placed yet
export function scoreRollingRecipe(recipe: RecipeType, ctx: ScoringContext): number {
  if (!ctx.rollingRecipeIds.includes(recipe.id)) return 0.5; // not a rolling recipe — neutral

  // Check if this rolling recipe is already placed in the plan
  const alreadyPlaced = ctx.assignedSlots.some((s) => s.recipe?.id === recipe.id);
  if (alreadyPlaced) return 0.5; // already placed — drop to neutral, let other scorers decide

  return 1; // not yet placed — full boost
}
