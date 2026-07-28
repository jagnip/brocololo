"use client";

import { useState } from "react";
import {
  formatDayLabel,
  getOrderedPlanSlots,
  getPlanSlotKey,
  getMealsForDate,
  groupSlotsByDate,
  getBatchGroupLabels,
} from "@/lib/planner/helpers";
import { PlanInputType, PlanSlotMealPayload, SlotInputType } from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlannerSlotCard } from "./planner-slot-card";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { getIngredientDisplayName } from "@/lib/ingredients/format";
import type { LogIngredientOption } from "@/components/log/log-ingredients-form";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { PlannerBulkActionsFooter } from "./planner-bulk-actions-footer";
import { PlanSlotMealDialog } from "./plan-slot-meal-dialog";
import { PlannerBulkEditEatersDialog } from "./planner-bulk-edit-eaters-dialog";
import { useSlotBulkSelection } from "./use-slot-bulk-selection";
import { getReplaceMealDialogCopy } from "@/lib/planner/plan-slot-meal-dialog-copy";
import { toast } from "sonner";

function getFridgeMatchIngredients(
  recipe: RecipeType,
  fridgeIngredientIds: string[],
): string[] {
  if (fridgeIngredientIds.length === 0) return [];
  return recipe.ingredients
    .filter((ri) => fridgeIngredientIds.includes(ri.ingredientId))
    .map((ri) =>
      getIngredientDisplayName(
        ri.ingredient.name,
        ri.ingredient.brand,
        ri.ingredient.descriptor,
      ),
    );
}

type PlanViewProps = {
  plan: PlanInputType;
  fridgeIngredientIds?: string[];
  recipes: RecipeType[];
  ingredientOptions: LogIngredientOption[];
  onShuffle?: (slotKey: string) => void;
  onSetMeal?: (slotKey: string, payload: PlanSlotMealPayload) => void;
  onRemove?: (slotKey: string) => void;
  onToggleUsed?: (slotKey: string) => void;
  familyMembers?: FamilyMemberRow[];
  onAudienceChange?: (slotKey: string, memberIds: string[]) => void;
};

export function PlanView({
  plan,
  fridgeIngredientIds = [],
  recipes,
  ingredientOptions,
  onShuffle,
  onSetMeal,
  onRemove,
  onToggleUsed,
  familyMembers = [],
  onAudienceChange,
}: PlanViewProps) {
  if (plan.length === 0) {
    return null;
  }

  const slotsByDate = groupSlotsByDate(plan);
  const sortedDates = Array.from(slotsByDate.keys()).sort();
  const orderedSlotKeys = getOrderedPlanSlots(plan).map((slot) => getPlanSlotKey(slot));
  // Compute once per render so every card can look up its live "N of M" label.
  const batchLabels = getBatchGroupLabels(plan);
  const {
    selectedKeys,
    selectedCount,
    isSelected,
    setSelectionForKey,
    shiftSelectToKey,
    clearSelection,
  } = useSlotBulkSelection({
    orderedKeys: orderedSlotKeys,
    onSelectionClearedByRebuild: () => {
      toast.info("Selection cleared after date range change.");
    },
  });

  const [isBulkReplaceDialogOpen, setIsBulkReplaceDialogOpen] = useState(false);
  const [isBulkEditEatersDialogOpen, setIsBulkEditEatersDialogOpen] =
    useState(false);
  const bulkReplaceDialogCopy = getReplaceMealDialogCopy(selectedCount);
  const canBulkEditEaters = onAudienceChange && familyMembers.length > 0;

  const handleBulkReplaceSave = async (payload: PlanSlotMealPayload) => {
    if (!onSetMeal) return;

    selectedKeys.forEach((slotKey) => {
      onSetMeal(slotKey, payload);
    });
    setIsBulkReplaceDialogOpen(false);
    clearSelection();
  };

  const handleBulkRemoveMeals = () => {
    if (!onRemove) return;

    selectedKeys.forEach((slotKey) => {
      onRemove(slotKey);
    });
    clearSelection();
  };

  const handleBulkEditEatersSave = (memberIds: string[]) => {
    if (!onAudienceChange) return;

    // Apply the same audience to every selected slot for a simple bulk replace flow.
    selectedKeys.forEach((slotKey) => {
      onAudienceChange(slotKey, memberIds);
    });
    setIsBulkEditEatersDialogOpen(false);
    clearSelection();
  };

  function renderSlot(slot: SlotInputType) {
    const slotKey = getPlanSlotKey(slot);
    return (
      <PlannerSlotCard
        slot={slot}
        isSelected={isSelected(slotKey)}
        onSelectionChange={(checked) => setSelectionForKey(slotKey, checked)}
        onShiftSelect={() => shiftSelectToKey(slotKey)}
        fridgeMatchIngredients={
          slot.recipe ? getFridgeMatchIngredients(slot.recipe, fridgeIngredientIds) : []
        }
        onShuffle={onShuffle ? () => onShuffle(slotKey) : undefined}
        onSetMeal={onSetMeal ? (payload) => onSetMeal(slotKey, payload) : undefined}
        onRemove={onRemove ? () => onRemove(slotKey) : undefined}
        onToggleUsed={onToggleUsed ? () => onToggleUsed(slotKey) : undefined}
        familyMembers={familyMembers}
        onAudienceChange={
          onAudienceChange
            ? (memberIds) => onAudienceChange(slotKey, memberIds)
            : undefined
        }
        batchLabel={batchLabels.get(slotKey)}
        recipes={recipes}
        ingredientOptions={ingredientOptions}
      />
    );
  }

  return (
    <section className="min-w-0 space-y-8">
      {sortedDates.map((dateKey) => {
        const { date, breakfast, lunch, dinner } = getMealsForDate(
          slotsByDate,
          dateKey,
        );

        return (
          <article key={dateKey} className="min-w-0 space-y-4">
            <Subheader>{formatDayLabel(date)}</Subheader>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {breakfast && (
                <div>
                  {renderSlot(breakfast)}
                </div>
              )}
              {lunch && (
                <div>
                  {renderSlot(lunch)}
                </div>
              )}
              {dinner && (
                <div>
                  {renderSlot(dinner)}
                </div>
              )}
            </div>
          </article>
        );
      })}
      <PlannerBulkActionsFooter
        selectedCount={selectedCount}
        onReplaceMeals={
          onSetMeal ? () => setIsBulkReplaceDialogOpen(true) : undefined
        }
        onEditEaters={
          canBulkEditEaters ? () => setIsBulkEditEatersDialogOpen(true) : undefined
        }
        onRemoveMeals={onRemove ? handleBulkRemoveMeals : undefined}
        onDone={clearSelection}
      />

      {onSetMeal ? (
        <PlanSlotMealDialog
          open={isBulkReplaceDialogOpen}
          onOpenChange={setIsBulkReplaceDialogOpen}
          title={bulkReplaceDialogCopy.title}
          subtitle={bulkReplaceDialogCopy.subtitle}
          saveLabel={bulkReplaceDialogCopy.saveLabel}
          recipes={recipes}
          ingredientOptions={ingredientOptions}
          initialRecipeId={null}
          initialCustomName=""
          initialRows={[]}
          familyMembers={familyMembers}
          cookingFamilyMemberIds={familyMembers.map((member) => member.id)}
          isSaving={false}
          onCancel={() => setIsBulkReplaceDialogOpen(false)}
          onSave={handleBulkReplaceSave}
        />
      ) : null}
      {canBulkEditEaters ? (
        <PlannerBulkEditEatersDialog
          open={isBulkEditEatersDialogOpen}
          familyMembers={familyMembers}
          onCancel={() => setIsBulkEditEatersDialogOpen(false)}
          onSave={handleBulkEditEatersSave}
        />
      ) : null}
    </section>
  );
}
