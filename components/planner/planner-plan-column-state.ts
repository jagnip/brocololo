import type { PlanInputType } from "@/types/planner";

export type PlannerPlanColumnMode = "loading" | "plan" | "failure" | "idle";

/** True when any slot already has a recipe or custom meal. */
export function planHasAnyMeal(plan: PlanInputType | null | undefined): boolean {
  if (!plan) return false;
  return plan.some((slot) => slot.recipe != null || slot.customMeal != null);
}

export function shouldShowGeneratedPlan(
  plan: PlanInputType | null,
  isGenerating: boolean,
): boolean {
  if (plan === null) return false;
  // While filling an empty plan, hide content in favor of the loading skeleton.
  // When some meals exist, keep showing them (pulse is applied by the form).
  if (isGenerating && !planHasAnyMeal(plan)) return false;
  return true;
}

export function getPlannerPlanColumnMode(params: {
  isGenerating: boolean;
  plan: PlanInputType | null;
  lastGenerationError: string | null;
}): PlannerPlanColumnMode {
  // Skeleton only when filling a fully empty plan; otherwise keep cards visible.
  if (params.isGenerating) {
    if (planHasAnyMeal(params.plan)) {
      return "plan";
    }
    return "loading";
  }
  // Failure wins over any stale plan left in memory before state updates flush.
  if (params.lastGenerationError) {
    return "failure";
  }
  if (shouldShowGeneratedPlan(params.plan, false)) {
    return "plan";
  }
  return "idle";
}
