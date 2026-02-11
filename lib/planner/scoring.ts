import { RecipeType } from "@/types/recipe";
import { SlotInputType } from "@/types/planner";
import { MealType } from "@/src/generated/enums";
import { differenceInDays } from "date-fns";

export type ScoringContext = {
  slotsAssignedSoFar: SlotInputType[];
  currentSlot: { date: Date; mealType: MealType };
  maxDaysSinceLastUsedCandidate: number; // max days since last used recipe in this pool of candidates
};

type Scorer = {
  name: string;
  fn: (recipe: RecipeType, ctx: ScoringContext) => number;
  weight: number;
};

const scorers: Scorer[] = [
  { name: "lastUsed", fn: scoreLastUsed, weight: 2 },
  { name: "alreadyInPlan", fn: scoreAlreadyInPlan, weight: 3 },
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
  const timesUsed = ctx.slotsAssignedSoFar.filter(
    (s) => s.recipe.id === recipe.id
  ).length;
  if (timesUsed === 0) return 1; // if the recipe has never been used in a plan, return 1
  return Math.max(1 - timesUsed * 0.5, 0); // normalize the score to 0-1
}

// export function pickBestCandidate(
//   candidates: RecipeType[],
//   ctx: ScoringContext
// ): RecipeType {
//   let best = candidates[0]!;
//   let bestScore = -Infinity;


//   for (const candidate of candidates) {
//     const scores = scorers.map(({ name, fn, weight }) => {
//       const raw = fn(candidate, ctx); // before adding weights 
//       return { name, raw, weighted: raw * weight };
//     });

//     const total = scores.reduce((sum, s) => sum + s.weighted, 0);

//     console.log(
//       `${candidate.name}: ${scores.map((s) => `${s.name}=${s.raw.toFixed(2)}(raw)×${s.weighted.toFixed(2)}(weighted)`).join(", ")} → total=${total.toFixed(2)}`
//     );

//     if (total > bestScore) {
//       bestScore = total;
//       best = candidate;
//     }
//   }

//   console.log(`→ Winner: ${best.name} (score=${bestScore.toFixed(2)})\n`);

//   return best;
// }

export function pickBestCandidate(
  candidates: RecipeType[],
  ctx: ScoringContext
): RecipeType {
  let bestCandidate = candidates[0]!;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    // Loop through all scorers: compute each raw score (0–1), multiply by its weight, and sum into a total
    const totalScore = scorers.reduce(
      (sum, { fn, weight }) => sum + fn(candidate, ctx) * weight, // calculate the row score and weight it
      0
    );

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}