"use client";

import type { PlanInputType, PlanSlotMealPayload } from "@/types/planner";
import type { RecipeType } from "@/types/recipe";
import { PlanView } from "./plan-view";
import { PlanViewSkeleton } from "./plan-view-skeleton";
import { PlannerPlanColumnEmpty } from "./planner-plan-column-empty";
import {
  getPlannerPlanColumnMode,
  type PlannerPlanColumnMode,
} from "./planner-plan-column-state";
import type { LogIngredientOption } from "@/components/log/log-ingredients-form";

export { getPlannerPlanColumnMode, type PlannerPlanColumnMode };

type PlannerPlanColumnProps = {
  mode: PlannerPlanColumnMode;
  plan: PlanInputType | null;
  lastGenerationError: string | null;
  fridgeIngredientIds: string[];
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
  onShuffle?: (slotKey: string) => void;
  onSetMeal?: (slotKey: string, payload: PlanSlotMealPayload) => void;
  onRemove?: (slotKey: string) => void;
};

export function PlannerPlanColumn({
  mode,
  plan,
  lastGenerationError,
  fridgeIngredientIds,
  recipes,
  ingredientOptions,
  onShuffle,
  onSetMeal,
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
        ingredientOptions={ingredientOptions}
        onShuffle={onShuffle}
        onSetMeal={onSetMeal}
        onRemove={onRemove}
      />
    );
  }

  if (mode === "failure") {
    return <PlannerPlanColumnEmpty variant="failure" />;
  }

  return <PlannerPlanColumnEmpty variant="idle" />;
}
