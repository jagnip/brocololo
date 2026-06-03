import type { PlanInputType } from "@/types/planner";

export type PlannerPlanColumnMode = "loading" | "plan" | "failure" | "idle";

export function shouldShowGeneratedPlan(
  plan: PlanInputType | null,
  isGenerating: boolean,
): boolean {
  // Keep result visibility rule explicit for UI and tests.
  return !isGenerating && plan !== null;
}

export function getPlannerPlanColumnMode(params: {
  isGenerating: boolean;
  plan: PlanInputType | null;
  lastGenerationError: string | null;
}): PlannerPlanColumnMode {
  if (params.isGenerating) {
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
