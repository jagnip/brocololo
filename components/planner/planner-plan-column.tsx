"use client";

import type { PlanInputType } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import { PlanView } from "./plan-view";
import { PlanViewSkeleton } from "./plan-view-skeleton";
import { PlannerPlanColumnEmpty } from "./planner-plan-column-empty";
import {
  getPlannerPlanColumnMode,
  type PlannerPlanColumnMode,
} from "./planner-plan-column-state";

export { getPlannerPlanColumnMode, type PlannerPlanColumnMode };

type PlannerPlanColumnProps = {
  mode: PlannerPlanColumnMode;
  plan: PlanInputType | null;
  lastGenerationError: string | null;
  fridgeIngredientIds: string[];
  recipes: RecipeType[];
  onShuffle?: (slotKey: string) => void;
  onReplace?: (slotKey: string, recipe: RecipeType) => void;
  onRemove?: (slotKey: string) => void;
};

export function PlannerPlanColumn({
  mode,
  plan,
  lastGenerationError,
  fridgeIngredientIds,
  recipes,
  onShuffle,
  onReplace,
  onRemove,
}: PlannerPlanColumnProps) {
  if (mode === "loading") {
    return <PlanViewSkeleton />;
  }

  if (mode === "plan" && plan) {
    return (
      <PlanView
        plan={plan}
        fridgeIngredientIds={fridgeIngredientIds}
        recipes={recipes}
        onShuffle={onShuffle}
        onReplace={onReplace}
        onRemove={onRemove}
      />
    );
  }

  if (mode === "failure") {
    return <PlannerPlanColumnEmpty variant="failure" />;
  }

  return <PlannerPlanColumnEmpty variant="idle" />;
}
