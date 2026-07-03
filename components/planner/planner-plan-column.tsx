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
import type { FamilyMemberRow } from "@/lib/db/family-members";

export { getPlannerPlanColumnMode, type PlannerPlanColumnMode };

type PlannerPlanColumnProps = {
  mode: PlannerPlanColumnMode;
  plan: PlanInputType | null;
  lastGenerationError: string | null;
  fridgeIngredientIds: string[];
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
  familyMembers?: FamilyMemberRow[];
  onShuffle?: (slotKey: string) => void;
  onSetMeal?: (slotKey: string, payload: PlanSlotMealPayload) => void;
  onRemove?: (slotKey: string) => void;
  onAudienceChange?: (slotKey: string, memberIds: string[]) => void;
};

export function PlannerPlanColumn({
  mode,
  plan,
  lastGenerationError,
  fridgeIngredientIds,
  recipes,
  ingredientOptions,
  familyMembers = [],
  onShuffle,
  onSetMeal,
  onRemove,
  onAudienceChange,
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
        familyMembers={familyMembers}
        onAudienceChange={onAudienceChange}
      />
    );
  }

  if (mode === "failure") {
    return <PlannerPlanColumnEmpty variant="failure" />;
  }

  return <PlannerPlanColumnEmpty variant="idle" />;
}
