"use client";

import type { PlanBatchInput, PlanInputType, PlanSlotMealPayload, SetPlanMealOptions } from "@/types/planner";
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
  batches?: PlanBatchInput[];
  lastGenerationError: string | null;
  fridgeIngredientIds: string[];
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
  familyMembers?: FamilyMemberRow[];
  onShuffle?: (slotKey: string) => void;
  onSetMeal?: (
    slotKey: string,
    payload: PlanSlotMealPayload,
    options?: SetPlanMealOptions,
  ) => void;
  onRemove?: (slotKey: string) => void;
  onRearrangeSlots?: (sourceKey: string, targetKey: string) => void;
  onAudienceChange?: (slotKey: string, memberIds: string[]) => void;
  onBatchesChange?: (batches: PlanBatchInput[]) => void;
  /** Forwarded to PlanView — create plan uses subtext under the column title. */
  dayLabelVariant?: "title" | "subtext";
};

export function PlannerPlanColumn({
  mode,
  plan,
  batches = [],
  fridgeIngredientIds,
  recipes,
  ingredientOptions,
  familyMembers = [],
  onShuffle,
  onSetMeal,
  onRemove,
  onRearrangeSlots,
  onAudienceChange,
  onBatchesChange,
  dayLabelVariant,
}: PlannerPlanColumnProps) {
  if (mode === "loading") {
    return <PlanViewSkeleton />;
  }

  if (mode === "plan" && plan) {
    return (
      <PlanView
        plan={plan}
        batches={batches}
        fridgeIngredientIds={fridgeIngredientIds}
        recipes={recipes}
        ingredientOptions={ingredientOptions}
        onShuffle={onShuffle}
        onSetMeal={onSetMeal}
        onRemove={onRemove}
        onRearrangeSlots={onRearrangeSlots}
        familyMembers={familyMembers}
        onAudienceChange={onAudienceChange}
        onBatchesChange={onBatchesChange}
        dayLabelVariant={dayLabelVariant}
      />
    );
  }

  if (mode === "failure") {
    return <PlannerPlanColumnEmpty variant="failure" />;
  }

  return <PlannerPlanColumnEmpty variant="idle" />;
}
