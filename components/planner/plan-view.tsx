"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  formatDayLabel,
  getOrderedPlanSlots,
  getPlanSlotKey,
  getMealsForDate,
  groupSlotsByDate,
  getBatchGroupLabels,
} from "@/lib/planner/helpers";
import {
  getBatchGroupSlotsForRecipe,
  getRecipeCookingHref,
} from "@/lib/planner/plan-recipe-link";
import {
  PlanInputType,
  PlanSlotMealPayload,
  SetPlanMealOptions,
  SlotInputType,
} from "@/types/planner";
import { RecipeType } from "@/types/recipe";
import { PlannerSlotCard } from "./planner-slot-card";
import {
  PLANNER_SLOT_DND_TYPE,
  PlannerSlotDndWrapper,
  PlannerSlotDragOverlayPreview,
  getPlannerSlotDragPreview,
  type PlannerSlotDragData,
} from "./planner-slot-dnd";
import { Subheader } from "@/components/recipes/recipe-page/subheader";
import { getIngredientDisplayName } from "@/lib/ingredients/format";
import type { LogIngredientOption } from "@/components/log/log-ingredients-form";
import type { FamilyMemberRow } from "@/lib/db/family-members";
import { PlannerBulkActionsFooter } from "./planner-bulk-actions-footer";
import { PlanSlotMealDialog } from "./plan-slot-meal-dialog";
import { PlannerBulkEditEatersDialog } from "./planner-bulk-edit-eaters-dialog";
import { useSlotBulkSelection } from "./use-slot-bulk-selection";
import { getBulkEditMealsDialogCopy } from "@/lib/planner/plan-slot-meal-dialog-copy";
import { cn } from "@/lib/utils";
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
  onSetMeal?: (
    slotKey: string,
    payload: PlanSlotMealPayload,
    options?: SetPlanMealOptions,
  ) => void;
  onRemove?: (slotKey: string) => void;
  /** Slot↔slot rearrange (move / swap). Enables DnD when provided. */
  onRearrangeSlots?: (sourceKey: string, targetKey: string) => void;
  onToggleUsed?: (slotKey: string) => void;
  familyMembers?: FamilyMemberRow[];
  onAudienceChange?: (slotKey: string, memberIds: string[]) => void;
  /**
   * Create-plan column titles own type-h2; days step down to subtext.
   * Plan detail keeps day labels as section titles (default).
   */
  dayLabelVariant?: "title" | "subtext";
};

export function PlanView({
  plan,
  fridgeIngredientIds = [],
  recipes,
  ingredientOptions,
  onShuffle,
  onSetMeal,
  onRemove,
  onRearrangeSlots,
  onToggleUsed,
  familyMembers = [],
  onAudienceChange,
  dayLabelVariant = "title",
}: PlanViewProps) {
  const [isBulkReplaceDialogOpen, setIsBulkReplaceDialogOpen] = useState(false);
  const [isBulkEditEatersDialogOpen, setIsBulkEditEatersDialogOpen] =
    useState(false);
  const [activeDrag, setActiveDrag] = useState<PlannerSlotDragData | null>(
    null,
  );

  // Mouse distance vs touch long-press so clicks/taps still open the meal dialog.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const orderedSlotKeys = getOrderedPlanSlots(plan).map((slot) =>
    getPlanSlotKey(slot),
  );
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

  if (plan.length === 0) {
    return null;
  }

  const slotsByDate = groupSlotsByDate(plan);
  const sortedDates = Array.from(slotsByDate.keys()).sort();
  // Compute once per render so every card can look up its live "N of M" label.
  const batchLabels = getBatchGroupLabels(plan);
  const bulkReplaceDialogCopy = getBulkEditMealsDialogCopy(selectedCount);
  const canBulkEditEaters = onAudienceChange && familyMembers.length > 0;
  const canRearrange = Boolean(onRearrangeSlots);

  // Seed bulk audience from the common defaulted audience across selected slots;
  // fall back to all members when the selection disagrees.
  const bulkInitialAudienceIds = (() => {
    const allMemberIds = familyMembers.map((member) => member.id);
    const keys = Array.from(selectedKeys);
    if (keys.length === 0) return allMemberIds;

    const audiences = keys.map((slotKey) => {
      const slot = plan.find((item) => getPlanSlotKey(item) === slotKey);
      if (
        slot?.cookingFamilyMemberIds &&
        slot.cookingFamilyMemberIds.length > 0
      ) {
        return [...slot.cookingFamilyMemberIds].sort();
      }
      return [...allMemberIds].sort();
    });

    const first = audiences[0]?.join(",") ?? "";
    const allMatch = audiences.every((ids) => ids.join(",") === first);
    return allMatch && audiences[0] ? audiences[0] : allMemberIds;
  })();

  const handleBulkReplaceSave = async (payload: PlanSlotMealPayload) => {
    if (!onSetMeal) return;

    // A batch recipe across several slots is one cook — share a group id so the
    // cards read "1 of N" and link to the same cooking session.
    const sharedBatchGroupId =
      payload.kind === "recipe" &&
      payload.recipe.isBatchRecipe &&
      selectedKeys.size > 1
        ? crypto.randomUUID()
        : null;

    selectedKeys.forEach((slotKey) => {
      onSetMeal(slotKey, payload, {
        expandMultiMeal: false,
        batchGroupId: sharedBatchGroupId,
      });
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

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as PlannerSlotDragData | undefined;
    if (data?.type === PLANNER_SLOT_DND_TYPE) {
      setActiveDrag(data);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    if (!onRearrangeSlots) return;

    const activeData = event.active.data.current as
      | PlannerSlotDragData
      | undefined;
    const overData = event.over?.data.current as
      | PlannerSlotDragData
      | undefined;
    if (!activeData || !overData) return;
    if (
      activeData.type !== PLANNER_SLOT_DND_TYPE ||
      overData.type !== PLANNER_SLOT_DND_TYPE
    ) {
      return;
    }
    if (activeData.slotKey === overData.slotKey) return;

    // Silent rearrange — no toast / confirm.
    onRearrangeSlots(activeData.slotKey, overData.slotKey);
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
  };

  function renderSlot(slot: SlotInputType) {
    const slotKey = getPlanSlotKey(slot);
    const householdIds = familyMembers.map((member) => member.id);
    // Batch recipes hand off the whole group's eaters; non-batch only this slot.
    const recipeCookingHref = slot.recipe
      ? getRecipeCookingHref(
          slot.recipe.slug,
          slot.recipe.isBatchRecipe && slot.batchGroupId
            ? getBatchGroupSlotsForRecipe(
                plan,
                slot.batchGroupId,
                slot.recipe.id,
              )
            : [slot],
          householdIds,
        )
      : undefined;

    const isFilled = Boolean(slot.recipe || slot.customMeal);
    const preview = getPlannerSlotDragPreview(slot);

    const card = (
      <PlannerSlotCard
        slot={slot}
        isSelected={isSelected(slotKey)}
        onSelectionChange={(checked) => setSelectionForKey(slotKey, checked)}
        onShiftSelect={() => shiftSelectToKey(slotKey)}
        fridgeMatchIngredients={
          slot.recipe
            ? getFridgeMatchIngredients(slot.recipe, fridgeIngredientIds)
            : []
        }
        onShuffle={onShuffle ? () => onShuffle(slotKey) : undefined}
        onSetMeal={
          onSetMeal ? (payload) => onSetMeal(slotKey, payload) : undefined
        }
        onRemove={onRemove ? () => onRemove(slotKey) : undefined}
        onToggleUsed={onToggleUsed ? () => onToggleUsed(slotKey) : undefined}
        familyMembers={familyMembers}
        onAudienceChange={
          onAudienceChange
            ? (memberIds) => onAudienceChange(slotKey, memberIds)
            : undefined
        }
        batchLabel={batchLabels.get(slotKey)}
        recipeCookingHref={recipeCookingHref}
        recipes={recipes}
        ingredientOptions={ingredientOptions}
      />
    );

    if (!canRearrange) {
      return card;
    }

    return (
      <PlannerSlotDndWrapper
        slotKey={slotKey}
        canDrag={isFilled}
        title={preview.title}
        imageUrl={preview.imageUrl}
      >
        {card}
      </PlannerSlotDndWrapper>
    );
  }

  const grid = (
    <section
      className={cn(
        "min-w-0",
        // Create plan: tighter day rhythm under the column title. Plan detail keeps roomier sections.
        dayLabelVariant === "subtext" ? "space-y-5" : "space-y-8",
      )}
    >
      {sortedDates.map((dateKey) => {
        const { date, breakfast, lunch, dinner } = getMealsForDate(
          slotsByDate,
          dateKey,
        );

        return (
          <article
            key={dateKey}
            className={cn(
              "min-w-0",
              dayLabelVariant === "subtext" ? "space-y-2" : "space-y-4",
            )}
          >
            {/* title = column-level Subheader; subtext = under "Meal plan for …". */}
            {dayLabelVariant === "subtext" ? (
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {formatDayLabel(date)}
              </h3>
            ) : (
              <Subheader>{formatDayLabel(date)}</Subheader>
            )}
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {breakfast && <div>{renderSlot(breakfast)}</div>}
              {lunch && <div>{renderSlot(lunch)}</div>}
              {dinner && <div>{renderSlot(dinner)}</div>}
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
          canBulkEditEaters
            ? () => setIsBulkEditEatersDialogOpen(true)
            : undefined
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
          defaultTab="repository"
          initialOccasionSlug={null}
          familyMembers={familyMembers}
          cookingFamilyMemberIds={bulkInitialAudienceIds}
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

  if (!canRearrange) {
    return grid;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {grid}
      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <PlannerSlotDragOverlayPreview
            title={activeDrag.title}
            imageUrl={activeDrag.imageUrl}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
