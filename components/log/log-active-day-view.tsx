"use client";

import { useEffect, useState } from "react";
import type {
  LogDayData,
  PlannerPoolGroupedCardData,
} from "@/lib/log/view-model";
import {
  LogIngredientsForm,
  type EditableIngredientRow,
  type LogIngredientOption,
} from "./log-ingredients-form";
import { LogDayHeader } from "./log-day-header";
import { LogPool } from "./log-pool";
import { LogSlot } from "./log-slot";
import { Subheader } from "../recipes/recipe-page/subheader";

/** Inline editor selection for the active log day (owned by `LogDayViewController`). */
export type SelectedSlotState = {
  dayKey: string;
  mealType: LogDayData["slots"][number]["mealType"];
  entryId: string;
  entryRecipeId: string | null;
  mealLabel: string;
  selectedRecipeId: string | null;
  initialSelectedRecipeId: string | null;
  subtitle: string;
  initialRows: EditableIngredientRow[];
};

export type LogActiveDayViewProps = {
  day: LogDayData;
  days: LogDayData[];
  groupedPlannerPool: PlannerPoolGroupedCardData[];
  editorSlot: SelectedSlotState | null;
  ingredientOptions: LogIngredientOption[];
  recipeOptions: Array<{
    id: string;
    name: string;
    initialRows: EditableIngredientRow[];
  }>;
  isSaving: boolean;
  isAddingDay: boolean;
  isRemovingDay: boolean;
  logId?: string;
  onSelectDay: (dateKey: string) => void;
  onAddDay: () => void;
  onRemoveDay: () => void;
  onEmptySlotClick: (slot: LogDayData["slots"][number]) => void;
  onRecipeClick: (
    slot: LogDayData["slots"][number],
    recipe: LogDayData["slots"][number]["recipes"][number],
  ) => void;
  onRecipeRemove: (slot: LogDayData["slots"][number]) => void;
  onSelectedRecipeIdChange: (recipeId: string | null) => void;
  onSave: (rows: EditableIngredientRow[]) => Promise<void>;
};

/** Tailwind `sm` is 640px — viewport widths below that use the narrow log layout. */
const SM_MIN_PX = 640;

/**
 * Client-only: used to place the ingredient editor under the active slot only below `sm`,
 * without duplicating `LogIngredientsForm` (which keeps local row state in one mount).
 */
function useIsBelowSm() {
  const [isBelow, setIsBelow] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SM_MIN_PX - 1}px)`);
    const sync = () => setIsBelow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isBelow;
}

function isEditorSlotForMeal(
  editor: SelectedSlotState | null,
  dayKey: string,
  mealType: LogDayData["slots"][number]["mealType"],
) {
  return (
    editor != null &&
    editor.dayKey === dayKey &&
    editor.mealType === mealType
  );
}

/** Single active day: header, planner pool, meal slots, and optional ingredient editor. */
export function LogActiveDayView({
  day,
  days,
  groupedPlannerPool,
  editorSlot,
  ingredientOptions,
  recipeOptions,
  isSaving,
  isAddingDay,
  isRemovingDay,
  logId,
  onSelectDay,
  onAddDay,
  onRemoveDay,
  onEmptySlotClick,
  onRecipeClick,
  onRecipeRemove,
  onSelectedRecipeIdChange,
  onSave,
}: LogActiveDayViewProps) {
  const belowSm = useIsBelowSm();
  // Until the media query runs, keep the previous side-by-side / bottom form (matches SSR).
  const showDetailsUnderActiveSlot = belowSm === true;
  const showDetailsInColumn = belowSm !== true;

  return (
    <article className="space-y-6">
      <LogDayHeader
        day={day}
        days={days}
        selectedDayKey={day.dateKey}
        onSelectDay={onSelectDay}
        logId={logId}
        isAddingDay={isAddingDay}
        onAddDay={onAddDay}
        isRemovingDay={isRemovingDay}
        onRemoveDay={onRemoveDay}
      />

      <div className="flex flex-col gap-6 2xl:grid 2xl:grid-cols-8 2xl:gap-2 2xl:items-stretch">
        <div className="2xl:col-span-2 2xl:min-h-0">
          <LogPool items={groupedPlannerPool} />
        </div>
        {/* `content-start`: when the log column is stretched to the pool height (2xl), avoid stretching grid rows so the Log subheader doesn’t grow with empty space. */}
        <div className="flex min-h-0 flex-col gap-y-2 lg:grid lg:grid-cols-5 lg:content-start lg:gap-x-2 lg:gap-y-2 2xl:col-span-6">
          <Subheader className="lg:col-span-5">Log</Subheader>
          <div className="lg:col-span-2">
            <div className="grid items-stretch gap-4 sm:grid-cols-2 sm:gap-2 lg:grid-cols-1 lg:gap-2">
              {day.slots.map((slot) => (
                <div
                  key={`${day.dateKey}-${slot.mealType}`}
                  className="flex flex-col gap-4 sm:contents"
                >
                  <LogSlot
                    dayKey={day.dateKey}
                    editorSlot={editorSlot}
                    slot={slot}
                    onEmptyClick={() => onEmptySlotClick(slot)}
                    onRecipeClick={(recipe) => onRecipeClick(slot, recipe)}
                    onRecipeRemove={() => onRecipeRemove(slot)}
                  />
                  {showDetailsUnderActiveSlot &&
                  editorSlot &&
                  isEditorSlotForMeal(
                    editorSlot,
                    day.dateKey,
                    slot.mealType,
                  ) ? (
                    <LogIngredientsForm
                      title={editorSlot.mealLabel}
                      subtitle={editorSlot.subtitle}
                      initialRows={editorSlot.initialRows}
                      ingredientOptions={ingredientOptions}
                      isSaving={isSaving}
                      recipeOptions={recipeOptions}
                      selectedRecipeId={editorSlot.selectedRecipeId}
                      initialSelectedRecipeId={
                        editorSlot.initialSelectedRecipeId
                      }
                      onSelectedRecipeIdChange={onSelectedRecipeIdChange}
                      onSave={onSave}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 lg:col-span-3">
            {showDetailsInColumn && editorSlot ? (
              <LogIngredientsForm
                title={editorSlot.mealLabel}
                subtitle={editorSlot.subtitle}
                initialRows={editorSlot.initialRows}
                ingredientOptions={ingredientOptions}
                isSaving={isSaving}
                recipeOptions={recipeOptions}
                selectedRecipeId={editorSlot.selectedRecipeId}
                initialSelectedRecipeId={editorSlot.initialSelectedRecipeId}
                onSelectedRecipeIdChange={onSelectedRecipeIdChange}
                onSave={onSave}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
